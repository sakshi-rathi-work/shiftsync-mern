// ShiftSync Express Application — Entry point
import './config/env'; // Must load first — validates required env vars
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';

import { env } from './config/env';
import { connectRedis, redis, isRedisAvailable } from './config/redis';
import { errorHandler } from './middleware/errorHandler';

// Route imports
import healthRoutes from './routes/healthRoutes';
import authRoutes from './routes/authRoutes';
import usersRoutes from './routes/usersRoutes';
import teamsRoutes from './routes/teamsRoutes';
import rosterRoutes from './routes/rosterRoutes';
import leaveRoutes from './routes/leaveRoutes';
import swapRoutes from './routes/swapRoutes';
import laborRuleRoutes from './routes/laborRuleRoutes';
import notificationRoutes from './routes/notificationRoutes';
import auditLogRoutes from './routes/auditLogRoutes';
import dashboardRoutes from './routes/dashboardRoutes';

const app = express();

// ─── Security Middleware ─────────────────────────────────────────────────────

app.use(helmet());

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Body + Cookie Parsing ───────────────────────────────────────────────────

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Global Rate Limiting (Redis if available, else in-memory) ────────────────

function buildRateLimiter(prefix: string, max: number, windowMs: number) {
  if (isRedisAvailable()) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { RedisStore } = require('rate-limit-redis') as typeof import('rate-limit-redis');
      const r = redis()!;
      return rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        store: new RedisStore({
          prefix,
          sendCommand: (command: string, ...args: string[]) =>
            r.call(command, ...args) as Promise<number>,
        }),
      });
    } catch {
      // fall through
    }
  }
  return rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false });
}

let globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
app.use((_req, _res, next) => globalLimiter(_req, _res, next));

// ─── Routes ──────────────────────────────────────────────────────────────────

app.use('/api/health',        healthRoutes);
app.use('/api/auth',          authRoutes);
app.use('/api/users',         usersRoutes);
app.use('/api/teams',         teamsRoutes);
app.use('/api/rosters',       rosterRoutes);
app.use('/api/leave-requests',leaveRoutes);
app.use('/api/swap-requests', swapRoutes);
app.use('/api/labor-rules',   laborRuleRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit-log',     auditLogRoutes);
app.use('/api/dashboard',     dashboardRoutes);

// ─── 404 Fallthrough ─────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'The requested endpoint does not exist.' },
  });
});

// ─── Global Error Handler (must be last) ─────────────────────────────────────

app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────

async function main() {
  await connectRedis();

  globalLimiter = buildRateLimiter('rl:global:', 500, 15 * 60 * 1000);

  app.listen(env.PORT, () => {
    console.log(`\n🚀 ShiftSync API  →  http://localhost:${env.PORT}`);
    console.log(`   Environment : ${env.NODE_ENV}`);
    console.log(`   Redis cache : ${isRedisAvailable() ? '✅ connected' : '⚠️  disabled (in-memory fallback)'}`);
    console.log(`   Health      : http://localhost:${env.PORT}/api/health\n`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export default app;
