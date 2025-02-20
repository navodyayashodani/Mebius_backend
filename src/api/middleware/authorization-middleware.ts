import { Request, Response, NextFunction } from "express";
import ForbiddenError from "../../domain/errors/forbidden-error";

// List of admin user IDs
const ADMIN_USER_IDS = ['user_2sk2GwRWkOZcJ4gazgpLrRnKn56']; // Add your admin user IDs

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  const auth = req.auth;
  console.log(auth);
  console.log(auth?.sessionClaims?.metadata.role);
  console.log(auth?.sessionClaims?.metadata.role !== "admin");
  
  if (auth?.sessionClaims?.metadata.role !== "admin") {
    throw new ForbiddenError("Forbidden");
  }

  next();
};


