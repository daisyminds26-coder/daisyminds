import { Worker } from 'bullmq'

import { logger } from '../config/logger'
import { bullConnectionOptions } from '../queues/connection'
import type { AuthEmailJobData } from '../queues/auth-email.queue'

/**
 * LogAdapter stub (Phase 2 plan, approved) — logs the verification/reset
 * link instead of sending a real email. No vendor is confirmed
 * (ARCHITECTURE.md §11); swapping one in later only touches this file.
 * Imported only from `server.ts` — never from `app.ts`/services — so
 * importing the app for tests never starts a Redis-connected worker.
 */
export const authEmailWorker = new Worker<AuthEmailJobData>(
  'auth-emails',
  // BullMQ's Processor type requires a Promise-returning function; this stub
  // has no async work yet, which is exactly what a real provider integration
  // would add here later.
  // eslint-disable-next-line @typescript-eslint/require-await
  async (job) => {
    logger.info(
      { jobName: job.name, email: job.data.email, link: job.data.link },
      'Auth email queued for delivery (stub — not actually sent)',
    )
  },
  { connection: bullConnectionOptions },
)

authEmailWorker.on('failed', (job, err: unknown) => {
  logger.error({ err, jobId: job?.id }, 'Auth email job failed')
})
