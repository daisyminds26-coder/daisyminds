import { isRedisConnected, redisClient } from '../config/redis'
import { logger } from '../config/logger'

const CACHE_PREFIX = 'dashboard:admin:'

/**
 * No cache-service abstraction exists elsewhere in the codebase yet — Redis
 * is currently only used for the health-readiness check (`config/redis.ts`).
 * This is deliberately a thin, best-effort wrapper rather than a new
 * general-purpose cache layer: every method swallows its own errors and
 * falls through to "no cached value," so a Redis outage degrades the
 * dashboard to always-fresh-from-DB instead of failing it. This also means
 * no Redis mock is needed in tests — `mongodb-memory-server` test runs never
 * call `connectRedis()`, so `isRedisConnected()` is simply `false` there and
 * every cache read/write is a real, harmless no-op.
 */
export async function getCachedDashboard<T>(key: string): Promise<T | null> {
  if (!isRedisConnected()) return null

  try {
    const raw = await redisClient.get(CACHE_PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch (error) {
    logger.warn({ err: error, key }, 'Dashboard cache read failed — falling back to a live query')
    return null
  }
}

export async function setCachedDashboard(
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  if (!isRedisConnected()) return

  try {
    await redisClient.set(CACHE_PREFIX + key, JSON.stringify(value), 'EX', ttlSeconds)
  } catch (error) {
    logger.warn({ err: error, key }, 'Dashboard cache write failed — response was still served')
  }
}
