import express from "express";

import 'dotenv/config';
import { productRouter } from "./api/product";
import { connectDB } from "./infrastructure/db";
import globalErrorHandlingMiddleware from "./api/middleware/global-error-handling-middleware";
import { categoryRouter } from "./api/category";
import cors from "cors";
import { orderRouter } from "./api/order";
import { paymentRouter } from './api/payment';

// import { clerkMiddleware } from "@clerk/express";

const app = express();

// Middleware order is important
app.use(express.json());
app.use(cors({
  origin: "https://fed-storefront-frontend-harindi.netlify.app",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));




// Routes
app.use("/api/products", productRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/orders", orderRouter);
app.use("/api/payments", paymentRouter);

app.use(globalErrorHandlingMiddleware as any);

connectDB();
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
