// Auth Controller — parses requests, calls authService, shapes response DTOs
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { loginUser, refreshTokens, logoutUser } from '../services/authService';
import { findUserById } from '../db/userRepository';
import { AppError } from '../middleware/errorHandler';
import { env } from '../config/env';

// ── Validation Schemas ─────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

// ── Cookie helper ──────────────────────────────────────────────────────────

const REFRESH_COOKIE_NAME = 'ss_refresh';
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: '/api/auth',
};

// ── Handlers ───────────────────────────────────────────────────────────────

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed.', parsed.error.errors);
    }

    const { email, password } = parsed.data;
    const { accessToken, refreshToken, user } = await loginUser(email, password);

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, COOKIE_OPTIONS);

    res.status(200).json({ data: { accessToken, user } });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;

    if (!refreshToken) {
      throw new AppError(401, 'UNAUTHENTICATED', 'No refresh token found.');
    }

    const { accessToken, refreshToken: newRefreshToken } = await refreshTokens(refreshToken);

    res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, COOKIE_OPTIONS);
    res.status(200).json({ data: { accessToken } });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.user) {
      await logoutUser(req.user.userId);
    }

    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
    res.status(200).json({ data: { message: 'Logged out successfully.' } });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Not authenticated.');
    }

    const user = await findUserById(req.user.userId, req.user.organizationId);

    if (!user) {
      throw new AppError(404, 'NOT_FOUND', 'User not found.');
    }

    res.status(200).json({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        teamId: user.teamId,
        hasOnboarded: user.hasOnboarded,
      },
    });
  } catch (err) {
    next(err);
  }
}
