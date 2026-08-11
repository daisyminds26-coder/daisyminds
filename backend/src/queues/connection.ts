import type { ConnectionOptions } from 'bullmq'

import { env } from '../config/env'

/**
 * Plain connection options (not a shared ioredis instance) so BullMQ manages
 * its own internal client per Queue/Worker with the settings it requires
 * (`maxRetriesPerRequest: null`) — deliberately not the same client as
 * `config/redis.ts`'s general-purpose one (ARCHITECTURE.md §6). Using a
 * shared client instance here also trips a TS structural mismatch, since
 * BullMQ bundles its own `ioredis` version distinct from the top-level one.
 */
function parseBullConnectionOptions(url: string): ConnectionOptions {
  const parsed = new URL(url)

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 6379,
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    tls: parsed.protocol === 'rediss:' ? {} : undefined,
    maxRetriesPerRequest: null,
  }
}

export const bullConnectionOptions: ConnectionOptions = parseBullConnectionOptions(env.REDIS_URL)
