// Health check route — GET /api/health
import { Router } from 'express';
import prisma from '../config/prisma';
import { redis, isRedisAvailable } from '../config/redis';

const router = Router();

router.get('/', async (_req, res) => {
  let dbStatus = 'ok';
  let redisStatus = isRedisAvailable() ? 'ok' : 'disabled';

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = 'error';
  }

  if (isRedisAvailable()) {
    try {
      await redis()!.ping();
    } catch {
      redisStatus = 'error';
    }
  }

  const healthy = dbStatus === 'ok';

  res.status(healthy ? 200 : 503).json({
    data: {
      status: healthy ? 'healthy' : 'degraded',
      db: dbStatus,
      redis: redisStatus,
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
