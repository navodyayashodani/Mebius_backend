import express from "express";
import { createOrder, getOrder, getMyOrders } from "../application/order";


export const orderRouter = express.Router();

orderRouter.get("/my-orders", getMyOrders);
orderRouter.post("/", createOrder);
orderRouter.get("/:id", getOrder); 


