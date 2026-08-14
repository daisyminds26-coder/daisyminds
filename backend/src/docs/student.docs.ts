import { z } from 'zod'

import { bearerAuth, errorResponseSchema, registry, successResponseSchema } from '../config/swagger'
import { USER_STATUSES } from '../models/user.model'
import { GENDERS, PROFILE_COMPLETION_STATUSES, STUDENT_SOURCES } from '../models/student.model'

const TAGS = ['Students']

const addressSchema = z.object({
  line1: z.string(),
  line2: z.string().nullable(),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
  country: z.string(),
})

const emergencyContactSchema = z.object({
  name: z.string(),
  phone: z.string(),
  relationship: z.string(),
  alternatePhone: z.string().nullable(),
  email: z.string().nullable(),
})

const educationRecordSchema = z.object({
  degree: z.string(),
  institution: z.string(),
  yearOfCompletion: z.number(),
  boardOrUniversity: z.string().nullable(),
  fieldOfStudy: z.string().nullable(),
  gradeValue: z.string().nullable(),
  gradeType: z.string().nullable(),
  documentUrl: z.string().nullable(),
  documentPublicId: z.string().nullable(),
})

const adminStudentSchema = z.object({
  id: z.string(),
  userId: z.string(),
  studentId: z.string(),
  email: z.email(),
  status: z.enum(USER_STATUSES),
  isDeleted: z.boolean(),
  emailVerifiedAt: z.iso.datetime().nullable(),
  lastLoginAt: z.iso.datetime().nullable(),
  firstName: z.string(),
  middleName: z.string().nullable(),
  lastName: z.string(),
  displayName: z.string().nullable(),
  dateOfBirth: z.iso.datetime().nullable(),
  gender: z.enum(GENDERS).nullable(),
  preferredLanguage: z.string().nullable(),
  phone: z.string().nullable(),
  alternatePhone: z.string().nullable(),
  address: addressSchema.nullable(),
  emergencyContacts: z.array(emergencyContactSchema),
  guardianName: z.string().nullable(),
  guardianPhone: z.string().nullable(),
  guardianEmail: z.string().nullable(),
  guardianRelationship: z.string().nullable(),
  guardianOccupation: z.string().nullable(),
  guardianAddressSameAsStudent: z.boolean(),
  guardianAddress: addressSchema.nullable(),
  educationRecords: z.array(educationRecordSchema),
  profilePhotoUrl: z.string().nullable(),
  profilePhotoPublicId: z.string().nullable(),
  admissionDate: z.iso.datetime().nullable(),
  source: z.enum(STUDENT_SOURCES).nullable(),
  counsellorId: z.string().nullable(),
  notes: z.string().nullable(),
  tags: z.array(z.string()),
  profileCompletionPercentage: z.number(),
  profileCompletionStatus: z.enum(PROFILE_COMPLETION_STATUSES),
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

const uploadSignatureSchema = z.object({
  timestamp: z.number(),
  signature: z.string(),
  apiKey: z.string(),
  cloudName: z.string(),
  folder: z.string(),
  publicId: z.string(),
  allowedFormats: z.array(z.string()),
  maxFileSize: z.number(),
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
const idParam = { params: z.object({ id: z.string() }) }

registry.registerPath({
  method: 'get',
  path: '/students',
  tags: TAGS,
  summary: 'List students — paginated, filterable, searchable',
  description:
    'Joins the `students` profile satellite with its linked `users` auth record via aggregation so account status/email can be filtered and searched alongside profile fields in one query.',
  security,
  responses: {
    200: {
      description: 'Paginated student list',
      content: {
        'application/json': { schema: successResponseSchema(z.array(adminStudentSchema)) },
      },
    },
    ...errorResponses(401, 403),
  },
})

registry.registerPath({
  method: 'get',
  path: '/students/export',
  tags: TAGS,
  summary: 'Export the filtered student list as CSV',
  description:
    'Returns `text/csv`, not the standard JSON envelope. Capped at 5,000 rows; CSV-formula-injection-safe (utils/csv.ts).',
  security,
  responses: {
    200: { description: 'CSV file', content: { 'text/csv': { schema: z.string() } } },
    ...errorResponses(401, 403),
  },
})

registry.registerPath({
  method: 'post',
  path: '/students',
  tags: TAGS,
  summary: 'Create a student (base user account + profile, in one call)',
  description:
    'Role is always STUDENT (resolved server-side — never accepted as client input). `studentId` is generated server-side via an atomic counter.',
  security,
  request: {
    body: jsonBody(z.object({ email: z.email(), password: z.string().min(10) }).partial()),
  },
  responses: {
    201: {
      description: 'Student created',
      content: { 'application/json': { schema: successResponseSchema(adminStudentSchema) } },
    },
    ...errorResponses(400, 401, 403, 409),
  },
})

registry.registerPath({
  method: 'post',
  path: '/students/bulk',
  tags: TAGS,
  summary: 'Activate, deactivate, delete, or restore multiple students at once',
  description:
    'Runs the same per-item guarded service methods as the single-student endpoints — a failed item is reported in `failed`, not silently skipped or allowed to abort the batch.',
  security,
  request: {
    body: jsonBody(
      z.object({
        action: z.enum(['activate', 'deactivate', 'delete', 'restore']),
        studentIds: z.array(z.string()).min(1).max(100),
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
  path: '/students/{id}',
  tags: TAGS,
  summary: 'Get a student by id',
  security,
  request: idParam,
  responses: {
    200: {
      description: 'Student',
      content: { 'application/json': { schema: successResponseSchema(adminStudentSchema) } },
    },
    ...errorResponses(401, 403, 404),
  },
})

registry.registerPath({
  method: 'patch',
  path: '/students/{id}',
  tags: TAGS,
  summary: 'Update a student profile',
  description:
    'Every field optional (partial update). `email`/`password`/role/`studentId`/audit fields are never accepted here — see student.validator.ts.',
  security,
  request: { ...idParam, body: jsonBody(z.record(z.string(), z.unknown())) },
  responses: {
    200: {
      description: 'Student updated',
      content: { 'application/json': { schema: successResponseSchema(adminStudentSchema) } },
    },
    ...errorResponses(400, 401, 403, 404),
  },
})

registry.registerPath({
  method: 'delete',
  path: '/students/{id}',
  tags: TAGS,
  summary: 'Soft-delete a student (soft-deletes the linked user account)',
  description:
    "The student profile document's own `isDeleted` stays false — only the linked user account is soft-deleted — so historical Enrollllment/attendance/grade references never dangle.",
  security,
  request: idParam,
  responses: {
    200: {
      description: 'Student deleted',
      content: { 'application/json': { schema: successResponseSchema(messageOnlySchema) } },
    },
    ...errorResponses(401, 403, 404),
  },
})

registry.registerPath({
  method: 'post',
  path: '/students/{id}/restore',
  tags: TAGS,
  summary: 'Restore a soft-deleted student',
  security,
  request: idParam,
  responses: {
    200: {
      description: 'Student restored',
      content: { 'application/json': { schema: successResponseSchema(adminStudentSchema) } },
    },
    ...errorResponses(401, 403, 404, 422),
  },
})

registry.registerPath({
  method: 'post',
  path: '/students/{id}/activate',
  tags: TAGS,
  summary: 'Activate a student account',
  security,
  request: idParam,
  responses: {
    200: {
      description: 'Student activated',
      content: { 'application/json': { schema: successResponseSchema(adminStudentSchema) } },
    },
    ...errorResponses(401, 403, 404),
  },
})

registry.registerPath({
  method: 'post',
  path: '/students/{id}/deactivate',
  tags: TAGS,
  summary: 'Deactivate a student account',
  security,
  request: idParam,
  responses: {
    200: {
      description: 'Student deactivated',
      content: { 'application/json': { schema: successResponseSchema(adminStudentSchema) } },
    },
    ...errorResponses(401, 403, 404),
  },
})

registry.registerPath({
  method: 'post',
  path: '/students/{id}/resend-invitation',
  tags: TAGS,
  summary: 'Resend the verification/invitation email to a PENDING_VERIFICATION student',
  security,
  request: idParam,
  responses: {
    200: {
      description: 'Invitation email sent',
      content: { 'application/json': { schema: successResponseSchema(messageOnlySchema) } },
    },
    ...errorResponses(401, 403, 404, 422),
  },
})

registry.registerPath({
  method: 'get',
  path: '/students/{id}/sessions',
  tags: TAGS,
  summary: "List a student's active sessions — SUPER_ADMIN only",
  security,
  request: idParam,
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
  path: '/students/{id}/sessions/{sessionId}',
  tags: TAGS,
  summary: "Force-revoke one of a student's sessions — SUPER_ADMIN only",
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
  path: '/students/{id}/logout-all',
  tags: TAGS,
  summary: "Force-revoke all of a student's sessions — SUPER_ADMIN only",
  security,
  request: idParam,
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
  path: '/students/{id}/audit-log',
  tags: TAGS,
  summary: "A student's audit timeline — SUPER_ADMIN only",
  security,
  request: idParam,
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

registry.registerPath({
  method: 'post',
  path: '/students/{id}/photo/signature',
  tags: TAGS,
  summary: 'Get a signed Cloudinary upload signature for a profile photo',
  description:
    'The frontend uploads directly to Cloudinary using these params, then confirms via `PATCH /students/{id}/photo` — the backend never proxies the image bytes and never hands out the Cloudinary API secret.',
  security,
  request: idParam,
  responses: {
    200: {
      description: 'Signed upload params',
      content: { 'application/json': { schema: successResponseSchema(uploadSignatureSchema) } },
    },
    ...errorResponses(401, 403, 404),
  },
})

registry.registerPath({
  method: 'patch',
  path: '/students/{id}/photo',
  tags: TAGS,
  summary: 'Confirm a completed profile-photo upload',
  description:
    'Verifies the given `publicId` against the Cloudinary Admin API before persisting it — a client-reported URL/publicId is never trusted directly. Deletes the previous photo asset, if any.',
  security,
  request: { ...idParam, body: jsonBody(z.object({ publicId: z.string() })) },
  responses: {
    200: {
      description: 'Profile photo updated',
      content: { 'application/json': { schema: successResponseSchema(adminStudentSchema) } },
    },
    ...errorResponses(400, 401, 403, 404),
  },
})

registry.registerPath({
  method: 'delete',
  path: '/students/{id}/photo',
  tags: TAGS,
  summary: "Remove a student's profile photo",
  security,
  request: idParam,
  responses: {
    200: {
      description: 'Profile photo removed',
      content: { 'application/json': { schema: successResponseSchema(adminStudentSchema) } },
    },
    ...errorResponses(401, 403, 404, 422),
  },
})
