import Redis from 'ioredis'

import { env } from './env'
import { logger } from './logger'

/**
 * General-purpose Redis client (caching, session-adjacent reads later).
 * Deliberately NOT shared with BullMQ (see queues/connection.ts) — BullMQ
 * requires `maxRetriesPerRequest: null`, which is the wrong setting for a
 * client also used for ordinary request-path reads.
 */
export const redisClient = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 200, 5000),
})

redisClient.on('connect', () => {
  logger.info('Redis connection established')
})

redisClient.on('ready', () => {
  logger.info('Redis client ready')
})

redisClient.on('error', (error: unknown) => {
  logger.error({ err: error }, 'Redis connection error')
})

redisClient.on('close', () => {
  logger.warn('Redis connection closed')
})

redisClient.on('reconnecting', (delayMs: number) => {
  logger.warn({ delayMs }, 'Redis reconnecting...')
})

/**
 * Redis is treated as a soft dependency at startup — a failure here is
 * logged, not thrown, so a transient Redis outage doesn't take the whole
 * API down. `/health/ready` reflects the real-time connection state so
 * load balancers still see accurate readiness.
 */
export async function connectRedis(): Promise<void> {
  try {
    await redisClient.connect()
  } catch (error) {
    logger.error({ err: error }, 'Initial Redis connection failed — will keep retrying')
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient.status === 'end') return
  await redisClient.quit()
  logger.info('Redis connection closed gracefully')
}

export function isRedisConnected(): boolean {
  return redisClient.status === 'ready'
}
