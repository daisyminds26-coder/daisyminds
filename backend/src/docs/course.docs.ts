import { z } from 'zod'

import { bearerAuth, errorResponseSchema, registry, successResponseSchema } from '../config/swagger'
import {
  COURSE_LEVELS,
  COURSE_VISIBILITIES,
  DELIVERY_MODES,
  DURATION_UNITS,
  PRICING_TYPES,
} from '../models/course.model'
import { APPROVAL_STATUSES, CURRENCY_CODES } from '../models/shared/enums'

const TAGS = ['Courses']

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

const pricingSchema = z.object({
  pricingType: z.enum(PRICING_TYPES),
  currency: z.enum(CURRENCY_CODES),
  basePrice: z.number(),
  discountPrice: z.number().nullable(),
  displayPrice: z.number(),
  taxInclusive: z.boolean(),
  saleStartsAt: z.iso.datetime().nullable(),
  saleEndsAt: z.iso.datetime().nullable(),
})

const adminCourseSchema = z.object({
  id: z.string(),
  courseCode: z.string(),
  title: z.string(),
  shortTitle: z.string().nullable(),
  slug: z.string(),
  shortDescription: z.string(),
  description: z.string(),
  category: z.string(),
  subcategory: z.string().nullable(),
  level: z.enum(COURSE_LEVELS),
  language: z.string(),
  secondaryLanguages: z.array(z.string()),
  tags: z.array(z.string()),
  durationValue: z.number().nullable(),
  durationUnit: z.enum(DURATION_UNITS).nullable(),
  deliveryMode: z.enum(DELIVERY_MODES),
  learningOutcomes: z.array(z.string()),
  skills: z.array(z.string()),
  prerequisites: z.array(z.string()),
  targetAudience: z.string().nullable(),
  eligibilityCriteria: z.string().nullable(),
  certificateEnabled: z.boolean(),
  maxStudentCapacity: z.number().nullable(),
  pricing: pricingSchema,
  visibility: z.enum(COURSE_VISIBILITIES),
  status: z.enum(APPROVAL_STATUSES),
  isFeatured: z.boolean(),
  featuredOrder: z.number().nullable(),
  metaTitle: z.string().nullable(),
  metaDescription: z.string().nullable(),
  canonicalUrl: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  thumbnailPublicId: z.string().nullable(),
  bannerUrl: z.string().nullable(),
  bannerPublicId: z.string().nullable(),
  eligibleTrainerIds: z.array(z.string()),
  internalNotes: z.string().nullable(),
  isDeleted: z.boolean(),
  publishedAt: z.iso.datetime().nullable(),
  archivedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

const readinessSchema = z.object({
  ready: z.boolean(),
  blockers: z.array(z.object({ field: z.string(), message: z.string() })),
})

const bulkActionResultSchema = z.object({
  succeeded: z.array(z.string()),
  failed: z.array(z.object({ id: z.string(), reason: z.string() })),
})

const signedUploadSchema = z.object({
  timestamp: z.number(),
  signature: z.string(),
  apiKey: z.string(),
  cloudName: z.string(),
  folder: z.string(),
  publicId: z.string(),
  allowedFormats: z.array(z.string()),
  maxFileSize: z.number(),
})

registry.registerPath({
  method: 'get',
  path: '/courses',
  tags: TAGS,
  summary: 'List courses — paginated, filterable, searchable',
  security,
  responses: {
    200: {
      description: 'Paginated course list',
      content: {
        'application/json': { schema: successResponseSchema(z.array(adminCourseSchema)) },
      },
    },
    ...errorResponses(401, 403),
  },
})

registry.registerPath({
  method: 'get',
  path: '/courses/export',
  tags: TAGS,
  summary: 'Export the filtered course list as CSV',
  description: 'Returns `text/csv`, not the standard JSON envelope. Capped at 5,000 rows.',
  security,
  responses: {
    200: { description: 'CSV file', content: { 'text/csv': { schema: z.string() } } },
    ...errorResponses(401, 403),
  },
})

registry.registerPath({
  method: 'post',
  path: '/courses',
  tags: TAGS,
  summary: 'Create a course (always starts as DRAFT)',
  security,
  request: { body: jsonBody(z.object({ title: z.string(), category: z.string() })) },
  responses: {
    201: {
      description: 'Course created',
      content: { 'application/json': { schema: successResponseSchema(adminCourseSchema) } },
    },
    ...errorResponses(400, 401, 403),
  },
})

registry.registerPath({
  method: 'get',
  path: '/courses/{id}',
  tags: TAGS,
  summary: 'Get a course by id',
  security,
  request: idParam,
  responses: {
    200: {
      description: 'Course',
      content: { 'application/json': { schema: successResponseSchema(adminCourseSchema) } },
    },
    ...errorResponses(401, 403, 404),
  },
})

registry.registerPath({
  method: 'patch',
  path: '/courses/{id}',
  tags: TAGS,
  summary: 'Update a course — courseCode is immutable and never accepted here',
  security,
  request: { ...idParam, body: jsonBody(z.object({ title: z.string().optional() })) },
  responses: {
    200: {
      description: 'Course updated',
      content: { 'application/json': { schema: successResponseSchema(adminCourseSchema) } },
    },
    ...errorResponses(400, 401, 403, 404),
  },
})

registry.registerPath({
  method: 'delete',
  path: '/courses/{id}',
  tags: TAGS,
  summary: 'Soft-delete a course',
  security,
  request: idParam,
  responses: {
    200: {
      description: 'Course deleted',
      content: { 'application/json': { schema: successResponseSchema(z.null()) } },
    },
    ...errorResponses(401, 403, 404),
  },
})

registry.registerPath({
  method: 'post',
  path: '/courses/{id}/readiness-check',
  tags: TAGS,
  summary: 'Check publication readiness without publishing',
  security,
  request: idParam,
  responses: {
    200: {
      description: 'Readiness result',
      content: { 'application/json': { schema: successResponseSchema(readinessSchema) } },
    },
    ...errorResponses(401, 403, 404),
  },
})

registry.registerPath({
  method: 'post',
  path: '/courses/{id}/publish',
  tags: TAGS,
  summary: 'Publish a course — rejected with structured blockers if not ready (422)',
  security,
  request: idParam,
  responses: {
    200: {
      description: 'Course published',
      content: { 'application/json': { schema: successResponseSchema(adminCourseSchema) } },
    },
    422: {
      description: 'Course is not ready to publish',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
    ...errorResponses(401, 403, 404),
  },
})

registry.registerPath({
  method: 'post',
  path: '/courses/{id}/unpublish',
  tags: TAGS,
  summary: 'Move a published course back to draft',
  security,
  request: idParam,
  responses: {
    200: {
      description: 'Course moved to draft',
      content: { 'application/json': { schema: successResponseSchema(adminCourseSchema) } },
    },
    ...errorResponses(401, 403, 404, 409),
  },
})

registry.registerPath({
  method: 'post',
  path: '/courses/{id}/archive',
  tags: TAGS,
  summary: 'Archive a course',
  security,
  request: idParam,
  responses: {
    200: {
      description: 'Course archived',
      content: { 'application/json': { schema: successResponseSchema(adminCourseSchema) } },
    },
    ...errorResponses(401, 403, 404, 409),
  },
})

registry.registerPath({
  method: 'post',
  path: '/courses/{id}/restore',
  tags: TAGS,
  summary: 'Restore a deleted or archived course (dual-purpose — see ARCHITECTURE.md)',
  security,
  request: idParam,
  responses: {
    200: {
      description: 'Course restored',
      content: { 'application/json': { schema: successResponseSchema(adminCourseSchema) } },
    },
    ...errorResponses(401, 403, 404, 409),
  },
})

registry.registerPath({
  method: 'get',
  path: '/courses/{id}/audit',
  tags: TAGS,
  summary: "A course's audit timeline",
  security,
  request: idParam,
  responses: {
    200: {
      description: 'Audit entries',
      content: { 'application/json': { schema: successResponseSchema(z.array(z.unknown())) } },
    },
    ...errorResponses(401, 403, 404),
  },
})

for (const mediaType of ['thumbnail', 'banner']) {
  registry.registerPath({
    method: 'post',
    path: `/courses/{id}/${mediaType}/signature`,
    tags: TAGS,
    summary: `Get a signed upload signature for the course ${mediaType}`,
    security,
    request: idParam,
    responses: {
      200: {
        description: 'Signed upload params',
        content: { 'application/json': { schema: successResponseSchema(signedUploadSchema) } },
      },
      ...errorResponses(401, 403, 404),
    },
  })
  registry.registerPath({
    method: 'post',
    path: `/courses/{id}/${mediaType}/verify`,
    tags: TAGS,
    summary: `Verify and confirm an uploaded ${mediaType} — never trusts the client's report alone`,
    security,
    request: { ...idParam, body: jsonBody(z.object({ publicId: z.string() })) },
    responses: {
      200: {
        description: `${mediaType} updated`,
        content: { 'application/json': { schema: successResponseSchema(adminCourseSchema) } },
      },
      ...errorResponses(400, 401, 403, 404),
    },
  })
  registry.registerPath({
    method: 'delete',
    path: `/courses/{id}/${mediaType}`,
    tags: TAGS,
    summary: `Remove the course ${mediaType}`,
    security,
    request: idParam,
    responses: {
      200: {
        description: `${mediaType} removed`,
        content: { 'application/json': { schema: successResponseSchema(adminCourseSchema) } },
      },
      ...errorResponses(401, 403, 404, 422),
    },
  })
}

for (const action of ['publish', 'archive', 'restore', 'delete']) {
  registry.registerPath({
    method: 'post',
    path: `/courses/bulk/${action}`,
    tags: TAGS,
    summary: `Bulk ${action} courses — per-item results on partial failure`,
    security,
    request: { body: jsonBody(z.object({ action: z.string(), courseIds: z.array(z.string()) })) },
    responses: {
      200: {
        description: 'Bulk action result',
        content: { 'application/json': { schema: successResponseSchema(bulkActionResultSchema) } },
      },
      ...errorResponses(400, 401, 403),
    },
  })
}
