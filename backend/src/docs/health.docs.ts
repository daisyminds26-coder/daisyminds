import { z } from 'zod'

import { errorResponseSchema, registry } from '../config/swagger'

const dependencyStatusSchema = z.object({
  status: z.enum(['ok', 'unavailable']),
})

const livenessSuccessSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    status: z.literal('ok'),
    uptime: z.number(),
    timestamp: z.iso.datetime(),
  }),
  requestId: z.uuid(),
})

const readinessSuccessSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    status: z.enum(['ok', 'unavailable']),
    dependencies: z.object({
      database: dependencyStatusSchema,
      redis: dependencyStatusSchema,
      cloudinary: dependencyStatusSchema,
    }),
  }),
  requestId: z.uuid(),
})

const healthSuccessSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    name: z.string(),
    version: z.string(),
    environment: z.string(),
    uptime: z.number(),
    timestamp: z.iso.datetime(),
    dependencies: readinessSuccessSchema.shape.data.shape.dependencies,
  }),
  requestId: z.uuid(),
})

registry.registerPath({
  method: 'get',
  path: '/health/live',
  summary: 'Liveness probe — confirms the Node.js process is running',
  tags: ['Health'],
  responses: {
    200: {
      description: 'Process is running',
      content: { 'application/json': { schema: livenessSuccessSchema } },
    },
  },
})

registry.registerPath({
  method: 'get',
  path: '/health/ready',
  summary: 'Readiness probe — checks MongoDB, Redis, and Cloudinary configuration',
  tags: ['Health'],
  responses: {
    200: {
      description: 'All dependencies are available',
      content: { 'application/json': { schema: readinessSuccessSchema } },
    },
    503: {
      description: 'One or more dependencies are unavailable',
      content: { 'application/json': { schema: readinessSuccessSchema } },
    },
  },
})

registry.registerPath({
  method: 'get',
  path: '/health',
  summary: 'Application health summary',
  tags: ['Health'],
  responses: {
    200: {
      description: 'Health check completed',
      content: { 'application/json': { schema: healthSuccessSchema } },
    },
    default: {
      description: 'Unexpected error',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
})
