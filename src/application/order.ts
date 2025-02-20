import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import ValidationError from "../domain/errors/validation-error";
import { getAuth } from "@clerk/express";
import Order from "../infrastructure/schemas/Order";
import NotFoundError from "../domain/errors/not-found-error";
import Address from "../infrastructure/schemas/Address";
import Product from "../infrastructure/schemas/Product";
import mongoose from "mongoose";

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

export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Start a transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Temporarily use a test user ID for development
    const userId = "user_2sk2GwRWkOZcJ4gazgpLrRnKn56"; // Your test user ID

    const result = orderSchema.safeParse(req.body);
    if (!result.success) {
      throw new ValidationError("Invalid order data");
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
      userId,
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

    // Commit the transaction
    await session.commitTransaction();
    
    // Get the complete order with populated address
    const populatedOrder = await Order.findById(order[0]._id)
      .populate({
        path: "addressId",
        model: "Address",
      });

    res.status(201).json(populatedOrder);
  } catch (error) {
    // If anything fails, abort the transaction
    await session.abortTransaction();
    next(error);
  } finally {
    // End the session
    session.endSession();
  }
};

export const getOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id;
    const order = await Order.findById(id).populate({
      path: "addressId",
      model: "Address",
    });
    if (!order) {
      throw new NotFoundError("Order not found");
    }
    res.status(200).json(order);
  } catch (error) {
    next(error);
  }
};

export const getMyOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Use test user ID for development
    const testUserId = "user_2sk2GwRWkOZcJ4gazgpLrRnKn56";

    const orders = await Order.find({ 
      userId: testUserId,
      paymentStatus: "PAID"  // Only get paid orders
    }).populate({
      path: "addressId",
      model: "Address",
      select: "line_1 line_2 city state zip_code phone"
    }).sort({ createdAt: -1 });

    console.log(`Found ${orders.length} paid orders for test user`);
    res.status(200).json(orders);

  } catch (error) {
    console.error("Error in getMyOrders:", error);
    next(error);
  }
}; 

  