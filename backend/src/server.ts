import type { Server } from 'node:http'

import { app } from './app'
import { verifyCloudinaryConfig } from './config/cloudinary'
import { connectDatabase, disconnectDatabase } from './config/database'
import { env } from './config/env'
import { logger } from './config/logger'
import { connectRedis, disconnectRedis } from './config/redis'
import { authEmailWorker } from './jobs/auth-email.job'
import { closeAllQueues } from './queues/queue.factory'

// Importing this registers every Mongoose model (models/index.ts) — must
// happen before any request that touches the database.
import './models'

const SHUTDOWN_TIMEOUT_MS = 10_000

function registerShutdownHandlers(server: Server): void {
  let shuttingDown = false

  const shutdown = (signal: string): void => {
    if (shuttingDown) return
    shuttingDown = true

    logger.info(`Received ${signal}, shutting down gracefully...`)

    const forceExitTimer = setTimeout(() => {
      logger.error('Graceful shutdown timed out, forcing exit')
      process.exit(1)
    }, SHUTDOWN_TIMEOUT_MS)
    forceExitTimer.unref()

    server.close((err) => {
      void (async () => {
        if (err) {
          logger.error({ err }, 'Error while closing HTTP server')
        }

        await closeAllQueues()
        await authEmailWorker.close()
        await disconnectRedis()
        await disconnectDatabase()

        clearTimeout(forceExitTimer)
        process.exit(err ? 1 : 0)
      })()
    })
  }

  process.on('SIGTERM', () => {
    shutdown('SIGTERM')
  })
  process.on('SIGINT', () => {
    shutdown('SIGINT')
  })

  process.on('unhandledRejection', (reason: unknown) => {
    logger.error({ err: reason }, 'Unhandled promise rejection')
  })

  process.on('uncaughtException', (error: Error) => {
    logger.fatal({ err: error }, 'Uncaught exception — exiting')
    process.exit(1)
  })
}

async function bootstrap(): Promise<void> {
  verifyCloudinaryConfig()
  await connectDatabase()
  await connectRedis()

  const server = app.listen(env.PORT, () => {
    logger.info(`${env.APP_NAME} listening on port ${String(env.PORT)} [${env.NODE_ENV}]`)
  })

  registerShutdownHandlers(server)
}

bootstrap().catch((error: unknown) => {
  logger.fatal({ err: error }, 'Failed to start server')
  process.exit(1)
})
