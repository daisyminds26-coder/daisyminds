import { z } from 'zod'

import { bearerAuth, errorResponseSchema, registry, successResponseSchema } from '../config/swagger'

const TAGS = ['Auth']

const publicUserSchema = z.object({
  id: z.string(),
  email: z.email(),
  role: z.string(),
  status: z.enum(['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'LOCKED', 'DEACTIVATED']),
  emailVerifiedAt: z.iso.datetime().nullable(),
  mfaEnabled: z.boolean(),
  lastLoginAt: z.iso.datetime().nullable(),
})

const meSchema = publicUserSchema.extend({ permissions: z.array(z.string()) })

const sessionSummarySchema = z.object({
  id: z.string(),
  userAgent: z.string().nullable(),
  ipAddress: z.string().nullable(),
  lastUsedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  isCurrent: z.boolean(),
})

const messageOnlySchema = z.object({}).openapi({ description: 'No data payload' })

const loginResponseSchema = z.object({
  accessToken: z.string(),
  user: publicUserSchema,
})

const refreshResponseSchema = z.object({ accessToken: z.string() })

function jsonBody<T extends z.ZodType>(schema: T) {
  return { content: { 'application/json': { schema } } }
}

function errorResponses(
  ...statusCodes: number[]
): Record<number, { description: string; content: unknown }> {
  return Object.fromEntries(
    statusCodes.map((code) => [
      code,
      { description: 'Error', content: { 'application/json': { schema: errorResponseSchema } } },
    ]),
  )
}

registry.registerPath({
  method: 'post',
  path: '/auth/login',
  tags: TAGS,
  summary: 'Authenticate with email and password',
  request: {
    body: jsonBody(z.object({ email: z.email(), password: z.string() })),
  },
  responses: {
    200: {
      description: 'Login successful',
      content: { 'application/json': { schema: successResponseSchema(loginResponseSchema) } },
    },
    ...errorResponses(401, 403, 429),
  },
})

registry.registerPath({
  method: 'post',
  path: '/auth/logout',
  tags: TAGS,
  summary: 'End the current session',
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    200: {
      description: 'Logged out',
      content: { 'application/json': { schema: successResponseSchema(messageOnlySchema) } },
    },
    ...errorResponses(401),
  },
})

registry.registerPath({
  method: 'post',
  path: '/auth/logout-all',
  tags: TAGS,
  summary: 'End every session for the current user',
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    200: {
      description: 'Logged out of all devices',
      content: { 'application/json': { schema: successResponseSchema(messageOnlySchema) } },
    },
    ...errorResponses(401),
  },
})

registry.registerPath({
  method: 'post',
  path: '/auth/refresh',
  tags: TAGS,
  summary: 'Rotate the refresh session and issue a new access token',
  description: 'Reads the refresh token from the httpOnly cookie — no request body.',
  responses: {
    200: {
      description: 'Token refreshed',
      content: { 'application/json': { schema: successResponseSchema(refreshResponseSchema) } },
    },
    ...errorResponses(401),
  },
})

registry.registerPath({
  method: 'post',
  path: '/auth/forgot-password',
  tags: TAGS,
  summary: 'Request a password reset link',
  description: 'Always returns a generic success response, whether or not the email exists.',
  request: { body: jsonBody(z.object({ email: z.email() })) },
  responses: {
    200: {
      description: 'Request accepted',
      content: { 'application/json': { schema: successResponseSchema(messageOnlySchema) } },
    },
    ...errorResponses(429),
  },
})

registry.registerPath({
  method: 'post',
  path: '/auth/reset-password',
  tags: TAGS,
  summary: 'Reset a password using a token from the forgot-password email',
  request: {
    body: jsonBody(z.object({ token: z.string(), newPassword: z.string().min(10) })),
  },
  responses: {
    200: {
      description: 'Password reset',
      content: { 'application/json': { schema: successResponseSchema(messageOnlySchema) } },
    },
    ...errorResponses(400, 429),
  },
})

registry.registerPath({
  method: 'post',
  path: '/auth/change-password',
  tags: TAGS,
  summary: "Change the current user's password",
  security: [{ [bearerAuth.name]: [] }],
  request: {
    body: jsonBody(z.object({ currentPassword: z.string(), newPassword: z.string().min(10) })),
  },
  responses: {
    200: {
      description: 'Password changed',
      content: { 'application/json': { schema: successResponseSchema(messageOnlySchema) } },
    },
    ...errorResponses(401),
  },
})

registry.registerPath({
  method: 'post',
  path: '/auth/verify-email',
  tags: TAGS,
  summary: 'Verify an email address using a token from the verification email',
  request: { body: jsonBody(z.object({ token: z.string() })) },
  responses: {
    200: {
      description: 'Email verified',
      content: { 'application/json': { schema: successResponseSchema(messageOnlySchema) } },
    },
    ...errorResponses(400),
  },
})

registry.registerPath({
  method: 'post',
  path: '/auth/resend-verification',
  tags: TAGS,
  summary: 'Resend the email verification link',
  description:
    'Always returns a generic success response, whether or not the email exists/is unverified.',
  request: { body: jsonBody(z.object({ email: z.email() })) },
  responses: {
    200: {
      description: 'Request accepted',
      content: { 'application/json': { schema: successResponseSchema(messageOnlySchema) } },
    },
    ...errorResponses(429),
  },
})

registry.registerPath({
  method: 'get',
  path: '/auth/me',
  tags: TAGS,
  summary: 'Get the current authenticated user',
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    200: {
      description: 'Current user',
      content: { 'application/json': { schema: successResponseSchema(meSchema) } },
    },
    ...errorResponses(401),
  },
})

registry.registerPath({
  method: 'get',
  path: '/auth/sessions',
  tags: TAGS,
  summary: "List the current user's active sessions",
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    200: {
      description: 'Active sessions',
      content: {
        'application/json': { schema: successResponseSchema(z.array(sessionSummarySchema)) },
      },
    },
    ...errorResponses(401),
  },
})

registry.registerPath({
  method: 'delete',
  path: '/auth/sessions/{id}',
  tags: TAGS,
  summary: 'Revoke a specific session by id',
  security: [{ [bearerAuth.name]: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: {
      description: 'Session revoked',
      content: { 'application/json': { schema: successResponseSchema(messageOnlySchema) } },
    },
    ...errorResponses(401, 404),
  },
})
