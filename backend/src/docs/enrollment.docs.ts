import { z } from 'zod'

import { bearerAuth, errorResponseSchema, registry, successResponseSchema } from '../config/swagger'
import { ENROLLMENT_SOURCES, ENROLLMENT_STATUSES } from '../models/enrollment.model'
import { ENROLLMENT_ACCESS_STATES } from '../services/enrollment-access.service'

const TAGS = ['Enrollments']

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

const adminEnrollmentSchema = z.object({
  id: z.string(),
  enrollmentCode: z.string(),
  studentId: z.string(),
  batchId: z.string(),
  courseId: z.string(),
  status: z.enum(ENROLLMENT_STATUSES),
  accessState: z.enum(ENROLLMENT_ACCESS_STATES),
  source: z.enum(ENROLLMENT_SOURCES),
  enrollmentDate: z.iso.datetime(),
  waitlistPosition: z.number().nullable(),
  waitlistedAt: z.iso.datetime().nullable(),
  confirmedAt: z.iso.datetime().nullable(),
  activatedAt: z.iso.datetime().nullable(),
  suspendedAt: z.iso.datetime().nullable(),
  resumedAt: z.iso.datetime().nullable(),
  completedAt: z.iso.datetime().nullable(),
  cancelledAt: z.iso.datetime().nullable(),
  droppedAt: z.iso.datetime().nullable(),
  accessStartsAt: z.iso.datetime().nullable(),
  accessEndsAt: z.iso.datetime().nullable(),
  transferredFromEnrollmentId: z.string().nullable(),
  transferredToEnrollmentId: z.string().nullable(),
  transferReason: z.string().nullable(),
  cancellationReason: z.string().nullable(),
  dropReason: z.string().nullable(),
  internalNotes: z.string().nullable(),
  tags: z.array(z.string()),
  isDeleted: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

const bulkResultSchema = z.object({
  succeeded: z.array(z.string()),
  waitlisted: z.array(z.string()),
  failed: z.array(z.object({ id: z.string(), reason: z.string() })),
})

registry.registerPath({
  method: 'get',
  path: '/enrollments',
  tags: TAGS,
  summary: 'List enrollments — paginated, filterable, searchable',
  security,
  responses: {
    200: {
      description: 'Paginated enrollment list',
      content: {
        'application/json': { schema: successResponseSchema(z.array(adminEnrollmentSchema)) },
      },
    },
    ...errorResponses(401, 403),
  },
})

registry.registerPath({
  method: 'get',
  path: '/enrollments/export',
  tags: TAGS,
  summary: 'Export the filtered enrollment list as CSV',
  security,
  responses: {
    200: { description: 'CSV file', content: { 'text/csv': { schema: z.string() } } },
    ...errorResponses(401, 403),
  },
})

registry.registerPath({
  method: 'post',
  path: '/enrollments',
  tags: TAGS,
  summary:
    'Create an enrollment (reserves a seat or waitlists — courseId is always derived from the batch)',
  security,
  request: { body: jsonBody(z.object({ studentId: z.string(), batchId: z.string() })) },
  responses: {
    201: {
      description: 'Enrollment created',
      content: { 'application/json': { schema: successResponseSchema(adminEnrollmentSchema) } },
    },
    ...errorResponses(400, 401, 403, 409),
  },
})

registry.registerPath({
  method: 'get',
  path: '/enrollments/{id}',
  tags: TAGS,
  summary: 'Get an enrollment by id',
  security,
  request: idParam,
  responses: {
    200: {
      description: 'Enrollment',
      content: { 'application/json': { schema: successResponseSchema(adminEnrollmentSchema) } },
    },
    ...errorResponses(401, 403, 404),
  },
})

const lifecycleSummaries: Record<string, string> = {
  confirm: 'PENDING -> CONFIRMED — reserves a seat',
  'promote-waitlist': 'WAITLISTED -> CONFIRMED — reserves a seat',
  activate: 'CONFIRMED -> ACTIVE',
  suspend: 'ACTIVE -> SUSPENDED — seat retained, access denied',
  resume: 'SUSPENDED -> ACTIVE',
  complete: 'ACTIVE -> COMPLETED — releases the seat',
  cancel: 'Cancel a non-terminal enrollment — releases the seat if one was held',
  drop: 'ACTIVE/SUSPENDED -> DROPPED — releases the seat',
}

for (const [action, summary] of Object.entries(lifecycleSummaries)) {
  registry.registerPath({
    method: 'post',
    path: `/enrollments/{id}/${action}`,
    tags: TAGS,
    summary,
    security,
    request: idParam,
    responses: {
      200: {
        description: 'Enrollment updated',
        content: { 'application/json': { schema: successResponseSchema(adminEnrollmentSchema) } },
      },
      ...errorResponses(401, 403, 404, 409),
    },
  })
}

registry.registerPath({
  method: 'post',
  path: '/enrollments/{id}/transfer',
  tags: TAGS,
  summary: 'Transfer a student to a different batch of the same course, atomically',
  security,
  request: { ...idParam, body: jsonBody(z.object({ targetBatchId: z.string() })) },
  responses: {
    200: {
      description: 'New (target) enrollment',
      content: { 'application/json': { schema: successResponseSchema(adminEnrollmentSchema) } },
    },
    ...errorResponses(400, 401, 403, 404, 409),
  },
})

registry.registerPath({
  method: 'get',
  path: '/enrollments/{id}/audit',
  tags: TAGS,
  summary: "An enrollment's audit timeline",
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

registry.registerPath({
  method: 'post',
  path: '/enrollments/bulk/enroll',
  tags: TAGS,
  summary:
    'Bulk-enroll multiple students into one batch — per-item results, sequential seat reservation',
  security,
  request: { body: jsonBody(z.object({ batchId: z.string(), studentIds: z.array(z.string()) })) },
  responses: {
    200: {
      description: 'Bulk result',
      content: { 'application/json': { schema: successResponseSchema(bulkResultSchema) } },
    },
    ...errorResponses(400, 401, 403),
  },
})

for (const action of ['suspend', 'resume', 'cancel']) {
  registry.registerPath({
    method: 'post',
    path: `/enrollments/bulk/${action}`,
    tags: TAGS,
    summary: `Bulk ${action} enrollments — per-item results on partial failure`,
    security,
    request: { body: jsonBody(z.object({ enrollmentIds: z.array(z.string()) })) },
    responses: {
      200: {
        description: 'Bulk result',
        content: { 'application/json': { schema: successResponseSchema(bulkResultSchema) } },
      },
      ...errorResponses(400, 401, 403),
    },
  })
}
