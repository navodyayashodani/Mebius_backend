import { NextFunction, Request, Response } from "express";
import Order from "../infrastructure/schemas/Order";
import Stripe from 'stripe';
import { z } from "zod";
import ValidationError from "../domain/errors/validation-error";
import Product from "../infrastructure/schemas/Product";
import mongoose from "mongoose";
import Address from "../infrastructure/schemas/Address";
import { MongoServerError } from "mongodb";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia'
});

const orderSchema = z.object({
  items: z
    .object({
      product: z.object({
        _id: z.string(),
        name: z.string(),
        price: z.string(),
        image: z.string(),
        description: z.string().optional(),
      }),
      quantity: z.number(),
    })
    .array(),
  shippingAddress: z.object({
    line_1: z.string(),
    line_2: z.string(),
    city: z.string(),
    state: z.string(),
    zip_code: z.string(),
    phone: z.string(),
  }),
});

export const handleWebhook = async (req: Request, res: Response, next: NextFunction) => {
  const { type, data } = req.body;

  if (type === "checkout.session.completed") {
    const session = data.object;

    if (!session.metadata || !session.metadata.orderId) {
      console.error("⚠️ No order ID found in session metadata");
      return res.status(400).send();
    }

    try {
      await Order.findByIdAndUpdate(session.metadata.orderId, { paymentStatus: "PAID" });
      console.log("✅ Order marked as PAID:", session.metadata.orderId);
    } catch (error) {
      console.error("❌ Error updating order status:", error);
      return res.status(500).send();
    }
  }

  res.status(200).send();
};


const MAX_RETRIES = 3;

export const createCheckoutSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let retryCount = 0;

  while (retryCount < MAX_RETRIES) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      console.log("Received request body:", req.body);

      // Validate the request body
      const result = orderSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError(`Invalid order data: ${JSON.stringify(result.error.format())}`);
      }

      // Check inventory for all products
      for (const item of result.data.items) {
        const product = await Product.findById(item.product._id).session(session);
        if (!product) {
          throw new ValidationError(`Product ${item.product._id} not found`);
        }
        if (product.stock < item.quantity) {
          throw new ValidationError(
            `Insufficient stock for product ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`
          );
        }
      }

      // Create address
      const address = await Address.create([{
        ...result.data.shippingAddress,
      }], { session });

      // Create order
      const order = await Order.create([{
        userId: 'user_2sk2GwRWkOZcJ4gazgpLrRnKn56', // Test user ID
        items: result.data.items,
        addressId: address[0]._id,
      }], { session });

      // Update inventory
      for (const item of result.data.items) {
        await Product.findByIdAndUpdate(
          item.product._id,
          { $inc: { stock: -item.quantity } },
          { session }
        );
      }

      // Create line items for Stripe Checkout
      const lineItems = result.data.items.map((item) => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.product.name,
            images: ["https://fed-storefront-backend-harindi.onrender.com" + item.product.image], // Convert to absolute URL
            description: item.product.description || 'No description available',
          },
          unit_amount: Math.round(parseFloat(item.product.price) * 100), // Convert price to cents
        },
        quantity: item.quantity,
      }));

      // Create the Stripe Checkout session
      const stripeSession = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL}/complete?order_id=${order[0]._id}`, // Pass order ID
        cancel_url: `${process.env.FRONTEND_URL}/cancel`,
        metadata: {
          orderId: order[0]._id.toString(), // Store order ID in metadata
        },
      });

      // Commit the transaction
      await session.commitTransaction();

      // Return the session URL for redirect
      return res.json({ url: stripeSession.url });
    } catch (error) {
      // Abort the transaction on error
      await session.abortTransaction();

      // Retry for transient errors
      if (error instanceof MongoServerError && error.errorLabels?.includes('TransientTransactionError') && retryCount < MAX_RETRIES) {
        retryCount++;
        console.warn(`Retrying transaction (attempt ${retryCount})...`);
        continue;
      }

      // Handle validation errors
      if (error instanceof ValidationError) {
        return res.status(400).json({
          message: 'Validation failed',
          error: error.message,
        });
      }

      // Handle other errors
      console.error('Checkout error:', error);
      return res.status(500).json({
        message: 'An error occurred while processing your details',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      // End the session
      session.endSession();
    }
  }

  // If all retries fail
  return res.status(500).json({
    message: 'Failed to process your request after multiple attempts',
  });
};