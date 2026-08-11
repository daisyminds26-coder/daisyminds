import type { Request, Response } from 'express'

import { sendSuccess } from '../utils/api-response'
import { getHealthStatus, getLivenessStatus, getReadinessStatus } from '../services/health.service'

export function getLive(_req: Request, res: Response): void {
  sendSuccess(res, { data: getLivenessStatus(), message: 'Process is running' })
}

export function getReady(_req: Request, res: Response): void {
  const readiness = getReadinessStatus()
  const statusCode = readiness.status === 'ok' ? 200 : 503

  sendSuccess(res, {
    data: readiness,
    message: readiness.status === 'ok' ? 'Ready' : 'One or more dependencies are unavailable',
    statusCode,
  })
}

export function getHealth(_req: Request, res: Response): void {
  sendSuccess(res, { data: getHealthStatus(), message: 'Health check completed' })
}
