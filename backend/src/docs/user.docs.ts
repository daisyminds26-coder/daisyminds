import { z } from 'zod'

import { bearerAuth, errorResponseSchema, registry, successResponseSchema } from '../config/swagger'
import { USER_STATUSES } from '../models/user.model'

const TAGS = ['Users']

const adminUserSchema = z.object({
  id: z.string(),
  email: z.email(),
  role: z.string(),
  roleId: z.string(),
  status: z.enum(USER_STATUSES),
  mfaEnabled: z.boolean(),
  lastLoginAt: z.iso.datetime().nullable(),
  lastLoginIp: z.string().nullable(),
  emailVerifiedAt: z.iso.datetime().nullable(),
  isDeleted: z.boolean(),
  deletedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

const sessionSchema = z.object({
  id: z.string(),
  userAgent: z.string().nullable(),
  ipAddress: z.string().nullable(),
  lastUsedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
})

const auditLogEntrySchema = z.object({
  id: z.string(),
  actorId: z.string().nullable(),
  actorRole: z.string().nullable(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  metadata: z.record(z.string(), z.unknown()),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.iso.datetime(),
})

const bulkResultSchema = z.object({
  succeeded: z.array(z.string()),
  failed: z.array(z.object({ id: z.string(), reason: z.string() })),
})

const messageOnlySchema = z.object({}).openapi({ description: 'No data payload' })

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

const security = [{ [bearerAuth.name]: [] }]

registry.registerPath({
  method: 'get',
  path: '/users',
  tags: TAGS,
  summary: 'List users — paginated, filterable, searchable',
  security,
  responses: {
    200: {
      description: 'Paginated user list',
      content: { 'application/json': { schema: successResponseSchema(z.array(adminUserSchema)) } },
    },
    ...errorResponses(401, 403),
  },
})

registry.registerPath({
  method: 'get',
  path: '/users/export',
  tags: TAGS,
  summary: 'Export the filtered user list as CSV',
  description: 'Returns `text/csv`, not the standard JSON envelope.',
  security,
  responses: {
    200: { description: 'CSV file', content: { 'text/csv': { schema: z.string() } } },
    ...errorResponses(401, 403),
  },
})

registry.registerPath({
  method: 'post',
  path: '/users',
  tags: TAGS,
  summary: 'Create a user',
  security,
  request: {
    body: jsonBody(
      z.object({
        email: z.email(),
        password: z.string().min(10),
        roleId: z.string(),
        sendVerificationEmail: z.boolean().default(true),
      }),
    ),
  },
  responses: {
    201: {
      description: 'User created',
      content: { 'application/json': { schema: successResponseSchema(adminUserSchema) } },
    },
    ...errorResponses(400, 401, 403, 409),
  },
})

registry.registerPath({
  method: 'post',
  path: '/users/bulk',
  tags: TAGS,
  summary: 'Activate, deactivate, or delete multiple users at once',
  description:
    'Applies the same per-item guards as the single-user endpoints (self-protection, last-SUPER_ADMIN, privilege escalation) — a blocked item is reported in `failed`, not silently skipped or aborted.',
  security,
  request: {
    body: jsonBody(
      z.object({
        action: z.enum(['activate', 'deactivate', 'delete']),
        userIds: z.array(z.string()).min(1).max(100),
      }),
    ),
  },
  responses: {
    200: {
      description: 'Bulk action result',
      content: { 'application/json': { schema: successResponseSchema(bulkResultSchema) } },
    },
    ...errorResponses(401, 403),
  },
})

registry.registerPath({
  method: 'get',
  path: '/users/{id}',
  tags: TAGS,
  summary: 'Get a user by id',
  security,
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: {
      description: 'User',
      content: { 'application/json': { schema: successResponseSchema(adminUserSchema) } },
    },
    ...errorResponses(401, 403, 404),
  },
})

registry.registerPath({
  method: 'patch',
  path: '/users/{id}',
  tags: TAGS,
  summary: "Update a user's email",
  description: 'Users is an auth-identity record only — email is the only editable field.',
  security,
  request: { params: z.object({ id: z.string() }), body: jsonBody(z.object({ email: z.email() })) },
  responses: {
    200: {
      description: 'User updated',
      content: { 'application/json': { schema: successResponseSchema(adminUserSchema) } },
    },
    ...errorResponses(401, 403, 404, 409),
  },
})

registry.registerPath({
  method: 'delete',
  path: '/users/{id}',
  tags: TAGS,
  summary: 'Soft-delete a user',
  security,
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: {
      description: 'User deleted',
      content: { 'application/json': { schema: successResponseSchema(messageOnlySchema) } },
    },
    ...errorResponses(401, 403, 404, 422),
  },
})

registry.registerPath({
  method: 'post',
  path: '/users/{id}/restore',
  tags: TAGS,
  summary: 'Restore a soft-deleted user',
  security,
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: {
      description: 'User restored',
      content: { 'application/json': { schema: successResponseSchema(adminUserSchema) } },
    },
    ...errorResponses(401, 403, 404, 422),
  },
})

registry.registerPath({
  method: 'post',
  path: '/users/{id}/activate',
  tags: TAGS,
  summary: 'Activate a user',
  security,
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: {
      description: 'User activated',
      content: { 'application/json': { schema: successResponseSchema(adminUserSchema) } },
    },
    ...errorResponses(401, 403, 404),
  },
})

registry.registerPath({
  method: 'post',
  path: '/users/{id}/deactivate',
  tags: TAGS,
  summary: 'Deactivate a user',
  description:
    "Blocked for the acting admin's own account, and for the last active SUPER_ADMIN account.",
  security,
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: {
      description: 'User deactivated',
      content: { 'application/json': { schema: successResponseSchema(adminUserSchema) } },
    },
    ...errorResponses(401, 403, 404, 422),
  },
})

registry.registerPath({
  method: 'patch',
  path: '/users/{id}/role',
  tags: TAGS,
  summary: "Assign a user's role",
  description:
    'Granting or removing SUPER_ADMIN requires the acting admin to already be SUPER_ADMIN; demoting the last active SUPER_ADMIN is blocked.',
  security,
  request: {
    params: z.object({ id: z.string() }),
    body: jsonBody(z.object({ roleId: z.string() })),
  },
  responses: {
    200: {
      description: 'Role assigned',
      content: { 'application/json': { schema: successResponseSchema(adminUserSchema) } },
    },
    ...errorResponses(400, 401, 403, 404, 422),
  },
})

registry.registerPath({
  method: 'post',
  path: '/users/{id}/reset-password',
  tags: TAGS,
  summary: 'Send a password-reset link to the user',
  security,
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: {
      description: 'Reset email sent',
      content: { 'application/json': { schema: successResponseSchema(messageOnlySchema) } },
    },
    ...errorResponses(401, 403, 404),
  },
})

registry.registerPath({
  method: 'post',
  path: '/users/{id}/resend-verification',
  tags: TAGS,
  summary: 'Resend the verification email to a PENDING_VERIFICATION user',
  security,
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: {
      description: 'Verification email sent',
      content: { 'application/json': { schema: successResponseSchema(messageOnlySchema) } },
    },
    ...errorResponses(401, 403, 404, 422),
  },
})

registry.registerPath({
  method: 'get',
  path: '/users/{id}/sessions',
  tags: TAGS,
  summary: "List a user's active sessions — SUPER_ADMIN only",
  security,
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: {
      description: 'Active sessions',
      content: { 'application/json': { schema: successResponseSchema(z.array(sessionSchema)) } },
    },
    ...errorResponses(401, 403, 404),
  },
})

registry.registerPath({
  method: 'delete',
  path: '/users/{id}/sessions/{sessionId}',
  tags: TAGS,
  summary: "Force-revoke one of a user's sessions — SUPER_ADMIN only",
  security,
  request: { params: z.object({ id: z.string(), sessionId: z.string() }) },
  responses: {
    200: {
      description: 'Session revoked',
      content: { 'application/json': { schema: successResponseSchema(messageOnlySchema) } },
    },
    ...errorResponses(401, 403, 404),
  },
})

registry.registerPath({
  method: 'post',
  path: '/users/{id}/logout-all',
  tags: TAGS,
  summary: "Force-revoke all of a user's sessions — SUPER_ADMIN only",
  security,
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: {
      description: 'All sessions revoked',
      content: { 'application/json': { schema: successResponseSchema(messageOnlySchema) } },
    },
    ...errorResponses(401, 403, 404),
  },
})

registry.registerPath({
  method: 'get',
  path: '/users/{id}/audit-log',
  tags: TAGS,
  summary: "A user's audit timeline — SUPER_ADMIN only (DATABASE.md §3.1)",
  security,
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: {
      description: 'Audit log entries',
      content: {
        'application/json': { schema: successResponseSchema(z.array(auditLogEntrySchema)) },
      },
    },
    ...errorResponses(401, 403),
  },
})
