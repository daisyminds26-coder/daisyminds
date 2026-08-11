import mongoose from 'mongoose'

import { env } from './env'
import { logger } from './logger'

const MAX_CONNECTION_ATTEMPTS = 5
const RETRY_DELAY_MS = 3000

function redactMongoUri(uri: string): string {
  try {
    const url = new URL(uri)
    if (url.username || url.password) {
      url.username = url.username ? '***' : ''
      url.password = ''
    }
    return url.toString()
  } catch {
    return 'mongodb://[unparseable-uri]'
  }
}

mongoose.connection.on('connected', () => {
  logger.info('MongoDB connection established')
})

mongoose.connection.on('error', (error: unknown) => {
  logger.error({ err: error }, 'MongoDB connection error')
})

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB connection lost')
})

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB connection restored')
})

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Connects with a bounded number of retries so a transient DNS/network blip
 * during deploy doesn't need a manual restart, but a genuinely unreachable
 * Atlas cluster still fails startup loudly instead of retrying forever.
 */
export async function connectDatabase(): Promise<void> {
  logger.info({ uri: redactMongoUri(env.MONGODB_URI) }, 'Connecting to MongoDB...')

  for (let attempt = 1; attempt <= MAX_CONNECTION_ATTEMPTS; attempt += 1) {
    try {
      await mongoose.connect(env.MONGODB_URI, {
        maxPoolSize: 20,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 10_000,
        socketTimeoutMS: 45_000,
        autoIndex: !env.isProduction,
      })
      return
    } catch (error) {
      logger.error(
        { err: error, attempt, maxAttempts: MAX_CONNECTION_ATTEMPTS },
        'MongoDB connection attempt failed',
      )

      if (attempt === MAX_CONNECTION_ATTEMPTS) {
        throw new Error(
          `Failed to connect to MongoDB after ${String(MAX_CONNECTION_ATTEMPTS)} attempts`,
        )
      }

      await delay(RETRY_DELAY_MS)
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState === mongoose.ConnectionStates.disconnected) return
  await mongoose.connection.close()
  logger.info('MongoDB connection closed gracefully')
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === mongoose.ConnectionStates.connected
}
