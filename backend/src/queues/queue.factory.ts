import { Queue, type DefaultJobOptions } from 'bullmq'

import { logger } from '../config/logger'
import { bullConnectionOptions } from './connection'

const defaultJobOptions: DefaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: { age: 24 * 60 * 60 },
  removeOnFail: { age: 7 * 24 * 60 * 60 },
}

const registeredQueues: Queue[] = []

/**
 * Reusable factory for future business queues (notifications, certificates,
 * etc. — ARCHITECTURE.md §6). No queue is registered by this initialization
 * task; modules call this when they're built.
 */
export function createQueue<DataType = unknown>(name: string): Queue<DataType> {
  const queue = new Queue<DataType>(name, {
    connection: bullConnectionOptions,
    defaultJobOptions,
  })

  queue.on('error', (error: unknown) => {
    logger.error({ err: error, queue: name }, 'BullMQ queue error')
  })

  registeredQueues.push(queue)
  return queue
}

export async function closeAllQueues(): Promise<void> {
  await Promise.all(registeredQueues.map((queue) => queue.close()))
}
