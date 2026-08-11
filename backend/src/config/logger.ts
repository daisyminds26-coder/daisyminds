import pino from 'pino'

import { env } from './env'

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body',
      '*.password',
      '*.token',
      '*.secret',
      '*.apiKey',
      '*.api_key',
    ],
    censor: '[REDACTED]',
  },
  transport: env.isDevelopment
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
    : undefined,
})
