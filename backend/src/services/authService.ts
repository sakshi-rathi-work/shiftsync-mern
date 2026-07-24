// Auth Service — business logic for login, token issuance, refresh, logout
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import {
  findUserByEmail,
  findUserByIdUnscoped,
  updateRefreshToken,
} from '../db/userRepository';
import { AppError } from '../middleware/errorHandler';

// ── Token shapes ──────────────────────────────────────────────────────────

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AccessTokenPayload {
  userId: string;
  organizationId: string;
  role: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  });
}

function signRefreshToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });
}

// ── Service functions ─────────────────────────────────────────────────────

/**
 * Validates email/password, returns token pair + user profile.
 * Throws 401 AppError on bad credentials or inactive user.
 */
export async function loginUser(
  email: string,
  password: string
): Promise<{ accessToken: string; refreshToken: string; user: object }> {
  const user = await findUserByEmail(email);

  if (!user) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Invalid email or password.');
  }

  if (!user.isActive) {
    throw new AppError(401, 'UNAUTHENTICATED', 'This account has been deactivated.');
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Invalid email or password.');
  }

  const payload: AccessTokenPayload = {
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role,
  };

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  // Store hashed refresh token in DB for rotation / revocation
  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
  await updateRefreshToken(user.id, hashedRefreshToken);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      teamId: user.teamId,
      hasOnboarded: user.hasOnboarded,
    },
  };
}

/**
 * Rotates the refresh token — verifies old token, issues new pair.
 * Throws 401 on invalid/expired/revoked token.
 */
export async function refreshTokens(
  refreshTokenCookie: string
): Promise<{ accessToken: string; refreshToken: string }> {
  let payload: AccessTokenPayload;

  try {
    payload = jwt.verify(
      refreshTokenCookie,
      env.JWT_REFRESH_SECRET
    ) as AccessTokenPayload;
  } catch {
    throw new AppError(401, 'UNAUTHENTICATED', 'Invalid or expired refresh token.');
  }

  const user = await findUserByIdUnscoped(payload.userId);

  if (!user || !user.hashedRefreshToken || !user.isActive) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Session not found or account inactive.');
  }

  const tokenMatch = await bcrypt.compare(refreshTokenCookie, user.hashedRefreshToken);
  if (!tokenMatch) {
    // Possible token reuse — invalidate all sessions for this user
    await updateRefreshToken(user.id, null);
    throw new AppError(401, 'UNAUTHENTICATED', 'Refresh token reuse detected. Please log in again.');
  }

  const newPayload: AccessTokenPayload = {
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role,
  };

  const newAccessToken = signAccessToken(newPayload);
  const newRefreshToken = signRefreshToken(newPayload);

  const hashedNewRefreshToken = await bcrypt.hash(newRefreshToken, 10);
  await updateRefreshToken(user.id, hashedNewRefreshToken);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

/**
 * Invalidates the refresh token stored in DB (logs the user out server-side).
 */
export async function logoutUser(userId: string): Promise<void> {
  await updateRefreshToken(userId, null);
}
