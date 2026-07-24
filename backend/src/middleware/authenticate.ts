// authenticate middleware — verifies JWT access token and attaches req.user
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthUser } from '../types';

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Missing or invalid Authorization header.',
      },
    });
    return;
  }

  const token = authHeader.slice(7); // Remove "Bearer "

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as {
      userId: string;
      organizationId: string;
      role: string;
    };

    req.user = {
      userId: payload.userId,
      organizationId: payload.organizationId,
      role: payload.role as AuthUser['role'],
    };

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Access token expired.',
        },
      });
      return;
    }

    res.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Invalid access token.',
      },
    });
  }
}
