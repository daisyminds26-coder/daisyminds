import { z } from 'zod'

import { bearerAuth, errorResponseSchema, registry, successResponseSchema } from '../config/swagger'
import { USER_STATUSES } from '../models/user.model'
import {
  AVAILABILITY_SLOT_TYPES,
  AVAILABILITY_STATUSES,
  DAYS_OF_WEEK,
  EMPLOYMENT_STATUSES,
  EMPLOYMENT_TYPES,
  GENDERS,
  PREFERRED_TIME_SLOTS,
  PROFILE_COMPLETION_STATUSES,
  TEACHING_LEVELS,
  TEACHING_MODES,
  TRAINER_SOURCES,
} from '../models/trainer.model'

const TAGS = ['Trainers']

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

const qualificationSchema = z.object({
  degree: z.string(),
  institution: z.string(),
  boardOrUniversity: z.string().nullable(),
  fieldOfStudy: z.string().nullable(),
  yearOfCompletion: z.number(),
  gradeValue: z.string().nullable(),
  gradeType: z.string().nullable(),
  documentUrl: z.string().nullable(),
  documentPublicId: z.string().nullable(),
})

const certificationSchema = z.object({
  name: z.string(),
  issuingOrganization: z.string(),
  credentialId: z.string().nullable(),
  issueDate: z.iso.datetime(),
  expiryDate: z.iso.datetime().nullable(),
  verificationUrl: z.string().nullable(),
  documentUrl: z.string().nullable(),
  documentPublicId: z.string().nullable(),
})

const availabilitySlotSchema = z.object({
  dayOfWeek: z.enum(DAYS_OF_WEEK),
  startTime: z.string(),
  endTime: z.string(),
  timeZone: z.string(),
  type: z.enum(AVAILABILITY_SLOT_TYPES),
  effectiveFrom: z.iso.datetime().nullable(),
  effectiveTo: z.iso.datetime().nullable(),
})

const adminTrainerSchema = z.object({
  id: z.string(),
  userId: z.string(),
  trainerId: z.string(),
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
  bio: z.string(),
  phone: z.string().nullable(),
  alternatePhone: z.string().nullable(),
  address: addressSchema.nullable(),
  emergencyContacts: z.array(emergencyContactSchema),
  designation: z.string().nullable(),
  department: z.string().nullable(),
  totalYearsExperience: z.number().nullable(),
  teachingYearsExperience: z.number().nullable(),
  industryYearsExperience: z.number().nullable(),
  expertiseAreas: z.array(z.string()),
  secondaryExpertise: z.array(z.string()),
  skills: z.array(z.string()),
  technologies: z.array(z.string()),
  specializations: z.array(z.string()),
  linkedinUrl: z.string().nullable(),
  portfolioUrl: z.string().nullable(),
  githubUrl: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  qualifications: z.array(qualificationSchema),
  certifications: z.array(certificationSchema),
  joiningDate: z.iso.datetime().nullable(),
  employmentType: z.enum(EMPLOYMENT_TYPES).nullable(),
  employmentStatus: z.enum(EMPLOYMENT_STATUSES),
  employeeCode: z.string().nullable(),
  reportingManagerId: z.string().nullable(),
  workLocation: z.string().nullable(),
  probationEndDate: z.iso.datetime().nullable(),
  noticePeriodDays: z.number().nullable(),
  preferredTeachingModes: z.array(z.enum(TEACHING_MODES)),
  preferredTimeSlots: z.array(z.enum(PREFERRED_TIME_SLOTS)),
  maxConcurrentBatches: z.number().nullable(),
  maxWeeklyTeachingHours: z.number().nullable(),
  availabilityStatus: z.enum(AVAILABILITY_STATUSES),
  availabilityNotes: z.string().nullable(),
  languagesOfInstruction: z.array(z.string()),
  teachingLevel: z.enum(TEACHING_LEVELS).nullable(),
  qualifiedToTeachSubjects: z.array(z.string()),
  availability: z.array(availabilitySlotSchema),
  documents: z.array(
    z.object({
      type: z.string(),
      url: z.string(),
      publicId: z.string().nullable(),
      uploadedAt: z.iso.datetime(),
    }),
  ),
  profilePhotoUrl: z.string().nullable(),
  profilePhotoPublicId: z.string().nullable(),
  source: z.enum(TRAINER_SOURCES).nullable(),
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
  path: '/trainers',
  tags: TAGS,
  summary: 'List trainers — paginated, filterable, searchable',
  description:
    'Joins the `trainers` profile satellite with its linked `users` auth record via aggregation, same pattern as `GET /students`.',
  security,
  responses: {
    200: {
      description: 'Paginated trainer list',
      content: {
        'application/json': { schema: successResponseSchema(z.array(adminTrainerSchema)) },
      },
    },
    ...errorResponses(401, 403),
  },
})

registry.registerPath({
  method: 'get',
  path: '/trainers/export',
  tags: TAGS,
  summary: 'Export the filtered trainer list as CSV',
  description: 'Returns `text/csv`, not the standard JSON envelope. Capped at 5,000 rows.',
  security,
  responses: {
    200: { description: 'CSV file', content: { 'text/csv': { schema: z.string() } } },
    ...errorResponses(401, 403),
  },
})

registry.registerPath({
  method: 'post',
  path: '/trainers',
  tags: TAGS,
  summary: 'Create a trainer (base user account + profile, in one call)',
  description:
    'Role is always TRAINER (resolved server-side — never accepted as client input). `trainerId` is generated server-side via an atomic counter.',
  security,
  request: {
    body: jsonBody(z.object({ email: z.email(), password: z.string().min(10) }).partial()),
  },
  responses: {
    201: {
      description: 'Trainer created',
      content: { 'application/json': { schema: successResponseSchema(adminTrainerSchema) } },
    },
    ...errorResponses(400, 401, 403, 409),
  },
})

registry.registerPath({
  method: 'post',
  path: '/trainers/bulk',
  tags: TAGS,
  summary: 'Activate, deactivate, delete, or restore multiple trainers at once',
  security,
  request: {
    body: jsonBody(
      z.object({
        action: z.enum(['activate', 'deactivate', 'delete', 'restore']),
        trainerIds: z.array(z.string()).min(1).max(100),
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
  path: '/trainers/{id}',
  tags: TAGS,
  summary: 'Get a trainer by id',
  security,
  request: idParam,
  responses: {
    200: {
      description: 'Trainer',
      content: { 'application/json': { schema: successResponseSchema(adminTrainerSchema) } },
    },
    ...errorResponses(401, 403, 404),
  },
})

registry.registerPath({
  method: 'patch',
  path: '/trainers/{id}',
  tags: TAGS,
  summary: 'Update a trainer profile',
  description:
    'Every field optional (partial update). `email`/`password`/role/`trainerId`/audit fields are never accepted here.',
  security,
  request: { ...idParam, body: jsonBody(z.record(z.string(), z.unknown())) },
  responses: {
    200: {
      description: 'Trainer updated',
      content: { 'application/json': { schema: successResponseSchema(adminTrainerSchema) } },
    },
    ...errorResponses(400, 401, 403, 404),
  },
})

registry.registerPath({
  method: 'delete',
  path: '/trainers/{id}',
  tags: TAGS,
  summary: 'Soft-delete a trainer (soft-deletes the linked user account)',
  security,
  request: idParam,
  responses: {
    200: {
      description: 'Trainer deleted',
      content: { 'application/json': { schema: successResponseSchema(messageOnlySchema) } },
    },
    ...errorResponses(401, 403, 404),
  },
})

registry.registerPath({
  method: 'post',
  path: '/trainers/{id}/restore',
  tags: TAGS,
  summary: 'Restore a soft-deleted trainer',
  security,
  request: idParam,
  responses: {
    200: {
      description: 'Trainer restored',
      content: { 'application/json': { schema: successResponseSchema(adminTrainerSchema) } },
    },
    ...errorResponses(401, 403, 404, 422),
  },
})

registry.registerPath({
  method: 'post',
  path: '/trainers/{id}/activate',
  tags: TAGS,
  summary: 'Activate a trainer account',
  security,
  request: idParam,
  responses: {
    200: {
      description: 'Trainer activated',
      content: { 'application/json': { schema: successResponseSchema(adminTrainerSchema) } },
    },
    ...errorResponses(401, 403, 404),
  },
})

registry.registerPath({
  method: 'post',
  path: '/trainers/{id}/deactivate',
  tags: TAGS,
  summary: 'Deactivate a trainer account',
  security,
  request: idParam,
  responses: {
    200: {
      description: 'Trainer deactivated',
      content: { 'application/json': { schema: successResponseSchema(adminTrainerSchema) } },
    },
    ...errorResponses(401, 403, 404),
  },
})

registry.registerPath({
  method: 'post',
  path: '/trainers/{id}/resend-invitation',
  tags: TAGS,
  summary: 'Resend the verification/invitation email to a PENDING_VERIFICATION trainer',
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
  path: '/trainers/{id}/sessions',
  tags: TAGS,
  summary: "List a trainer's active sessions — SUPER_ADMIN only",
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
  path: '/trainers/{id}/sessions/{sessionId}',
  tags: TAGS,
  summary: "Force-revoke one of a trainer's sessions — SUPER_ADMIN only",
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
  path: '/trainers/{id}/logout-all',
  tags: TAGS,
  summary: "Force-revoke all of a trainer's sessions — SUPER_ADMIN only",
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
  path: '/trainers/{id}/audit-log',
  tags: TAGS,
  summary: "A trainer's audit timeline — SUPER_ADMIN only",
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
  path: '/trainers/{id}/photo/signature',
  tags: TAGS,
  summary: 'Get a signed Cloudinary upload signature for a profile photo',
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
  path: '/trainers/{id}/photo',
  tags: TAGS,
  summary: 'Confirm a completed profile-photo upload',
  description:
    'Verifies the given `publicId` against the Cloudinary Admin API before persisting it — a client-reported URL/publicId is never trusted directly.',
  security,
  request: { ...idParam, body: jsonBody(z.object({ publicId: z.string() })) },
  responses: {
    200: {
      description: 'Profile photo updated',
      content: { 'application/json': { schema: successResponseSchema(adminTrainerSchema) } },
    },
    ...errorResponses(400, 401, 403, 404),
  },
})

registry.registerPath({
  method: 'delete',
  path: '/trainers/{id}/photo',
  tags: TAGS,
  summary: "Remove a trainer's profile photo",
  security,
  request: idParam,
  responses: {
    200: {
      description: 'Profile photo removed',
      content: { 'application/json': { schema: successResponseSchema(adminTrainerSchema) } },
    },
    ...errorResponses(401, 403, 404, 422),
  },
})
