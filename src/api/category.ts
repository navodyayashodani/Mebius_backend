import express from "express";
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategory,
  updateCategory,
} from "../application/category";
import { isAuthenticated } from "./middleware/authentication-middleware";
import { isAdmin } from "./middleware/authorization-middleware";

export const categoryRouter = express.Router();

categoryRouter
  .route("/")
  .get(getCategories)
  .post(createCategory); // Removed middleware

categoryRouter
  .route("/:id")
  .get(getCategory)
  .delete(deleteCategory)  // Removed middleware
  .patch(updateCategory);  // Removed middleware