// requireRole middleware factory — enforces role-based access control
// Usage: router.get('/route', authenticate, requireRole('ADMIN', 'MANAGER'), handler)
import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types';

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Not authenticated.',
        },
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `This action requires one of the following roles: ${roles.join(', ')}.`,
        },
      });
      return;
    }

    next();
  };
}
