import { isCloudinaryConfigured } from '../config/cloudinary'
import { env } from '../config/env'
import { isDatabaseConnected } from '../config/database'
import { isRedisConnected } from '../config/redis'

export interface LivenessStatus {
  status: 'ok'
  uptime: number
  timestamp: string
}

export interface DependencyStatus {
  status: 'ok' | 'unavailable'
}

export interface ReadinessStatus {
  status: 'ok' | 'unavailable'
  dependencies: {
    database: DependencyStatus
    redis: DependencyStatus
    cloudinary: DependencyStatus
  }
}

export interface HealthStatus {
  name: string
  version: string
  environment: string
  uptime: number
  timestamp: string
  dependencies: ReadinessStatus['dependencies']
}

export function getLivenessStatus(): LivenessStatus {
  return {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }
}

export function getReadinessStatus(): ReadinessStatus {
  const dependencies: ReadinessStatus['dependencies'] = {
    database: { status: isDatabaseConnected() ? 'ok' : 'unavailable' },
    redis: { status: isRedisConnected() ? 'ok' : 'unavailable' },
    cloudinary: { status: isCloudinaryConfigured() ? 'ok' : 'unavailable' },
  }

  const allReady = Object.values(dependencies).every((dependency) => dependency.status === 'ok')

  return {
    status: allReady ? 'ok' : 'unavailable',
    dependencies,
  }
}

export function getHealthStatus(): HealthStatus {
  const readiness = getReadinessStatus()

  return {
    name: env.APP_NAME,
    version: '1.0.0',
    environment: env.NODE_ENV,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    dependencies: readiness.dependencies,
  }
}
