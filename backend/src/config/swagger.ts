import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'

import { env } from './env'

extendZodWithOpenApi(z)

export const registry = new OpenAPIRegistry()

export const errorResponseSchema = registry.register(
  'ErrorResponse',
  z.object({
    success: z.literal(false),
    message: z.string().openapi({ example: 'Resource not found' }),
    code: z.string().openapi({ example: 'NOT_FOUND' }),
    errors: z.array(z.object({ field: z.string(), message: z.string() })).optional(),
    details: z.record(z.string(), z.unknown()).optional().openapi({
      description: "Error-specific structured data, e.g. ACCOUNT_LOCKED's lockedUntil",
    }),
    requestId: z.uuid(),
  }),
)

/** Shared success-envelope shape (API-STANDARDS.md §3) — every route's response schema wraps its own `data` type with this. */
export function successResponseSchema<DataSchema extends z.ZodType>(dataSchema: DataSchema) {
  return z.object({
    success: z.literal(true),
    message: z.string(),
    data: dataSchema,
    requestId: z.uuid(),
  })
}

export const bearerAuth = registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
})

export function generateOpenApiDocument(): ReturnType<OpenApiGeneratorV3['generateDocument']> {
  const generator = new OpenApiGeneratorV3(registry.definitions)

  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'Daisy Minds LMS API',
      version: '1.0.0',
      description: 'Daisy Minds LMS — API foundation. Business endpoints are added per module.',
    },
    servers: [{ url: env.API_PREFIX, description: env.NODE_ENV }],
  })
}
