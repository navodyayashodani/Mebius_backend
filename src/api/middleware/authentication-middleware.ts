import { Request, Response, NextFunction } from "express";
import UnauthorizedError from "../../domain/errors/unauthorized-error";
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";

// Use Clerk's middleware and combine with your custom logic
export const isAuthenticated = [
  ClerkExpressRequireAuth(),
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth?.userId) {
      throw new UnauthorizedError("Unauthorized");
    }
    next();
  }
];