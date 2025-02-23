import { clerkClient } from '@clerk/clerk-sdk-node';
import { Request, Response, NextFunction } from 'express';
import UnauthorizedError from '../../domain/errors/unauthorized-error';
import { AuthObject } from '@clerk/backend';

export const isAuthenticated = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const { sub: userId } = await clerkClient.verifyToken(token, {
      jwtKey: process.env.CLERK_SECRET_KEY
    });

    if (!userId) {
      throw new UnauthorizedError('Invalid token');
    }

    req.auth = { userId } as AuthObject;
    next();
  } catch (error) {
    console.error('Auth Error:', error);
    next(new UnauthorizedError('Unauthorized'));
  }
};