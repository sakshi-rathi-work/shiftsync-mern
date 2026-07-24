// Auth routes — thin router delegating to authController
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { login, refresh, logout, getMe } from '../controllers/authController';
import { authenticate } from '../middleware/authenticate';
import { redis, isRedisAvailable } from '../config/redis';

const router = Router();

// Stricter rate limit for login (brute-force protection)
// Uses Redis if available, falls back to in-memory
function buildLoginLimiter() {
  if (isRedisAvailable()) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { RedisStore } = require('rate-limit-redis') as typeof import('rate-limit-redis');
      const r = redis()!;
      return rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 10,
        standardHeaders: true,
        legacyHeaders: false,
        store: new RedisStore({
          prefix: 'rl:login:',
          sendCommand: (command: string, ...args: string[]) =>
            r.call(command, ...args) as Promise<number>,
        }),
        message: {
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many login attempts. Please try again in 15 minutes.',
          },
        },
      });
    } catch {
      // fall through
    }
  }
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many login attempts. Please try again in 15 minutes.',
      },
    },
  });
}

const loginLimiter = buildLoginLimiter();

router.post('/login', loginLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

export default router;
