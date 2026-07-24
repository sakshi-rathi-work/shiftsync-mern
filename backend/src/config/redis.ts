// Redis client — optional for local dev.
// If Redis is unreachable, isRedisAvailable() returns false and callers
// gracefully degrade (in-memory rate limit, no roster cache).
import Redis from 'ioredis';
import { env } from './env';

let redisClient: Redis | null = null;
let redisAvailable = false;

export function getRedisClient(): Redis | null {
  return redisClient;
}

export function isRedisAvailable(): boolean {
  return redisAvailable;
}

// Attempt connection — non-fatal if Redis is not running
export async function connectRedis(): Promise<void> {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    enableReadyCheck: true,
    connectTimeout: 2000,
  });

  client.on('connect', () => {
    redisAvailable = true;
    console.log('[Redis] Connected ✅');
  });

  client.on('error', () => {
    redisAvailable = false;
  });

  try {
    await client.connect();
    await client.ping();
    redisAvailable = true;
    redisClient = client;
  } catch {
    console.warn('[Redis] Not available — rate limiting uses in-memory store, roster cache disabled.');
    redisAvailable = false;
    client.disconnect();
  }
}

// Safe wrapper — returns null if Redis is unavailable
export function redis(): Redis | null {
  return redisAvailable ? redisClient : null;
}
