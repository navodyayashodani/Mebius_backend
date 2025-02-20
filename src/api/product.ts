import express from "express";
import { isAuthenticated } from "./middleware/authentication-middleware";
import { isAdmin } from "./middleware/authorization-middleware";
import { 
  createProduct, 
  updateProduct, 
  deleteProduct, 
  getProducts,
  getProduct,
  checkStock,
  updateProductStock 
} from "../application/product";

export const productRouter = express.Router();

// Public routes
productRouter.get("/", getProducts);
productRouter.get("/:id", getProduct);

// Protected admin routes
productRouter.post("/", isAuthenticated, isAdmin, createProduct);
productRouter.patch("/:id", isAuthenticated, isAdmin, updateProduct);
productRouter.delete("/:id", isAuthenticated, isAdmin, deleteProduct);

// Stock routes
productRouter.get("/:id/stock", checkStock);
productRouter.patch("/:id/stock", updateProductStock); 