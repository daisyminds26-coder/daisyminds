import { z } from 'zod'

import { bearerAuth, errorResponseSchema, registry, successResponseSchema } from '../config/swagger'
import {
  BATCH_DELIVERY_MODES,
  BATCH_STATUSES,
  CALENDAR_EXCEPTION_TYPES,
  DAYS_OF_WEEK,
  MEETING_PROVIDERS,
} from '../models/batch.model'

const TAGS = ['Batches']

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

const weeklyScheduleSlotSchema = z.object({
  dayOfWeek: z.enum(DAYS_OF_WEEK),
  startTime: z.string(),
  endTime: z.string(),
  sessionLabel: z.string().nullable(),
  locationOverride: z.string().nullable(),
  deliveryModeOverride: z.enum(BATCH_DELIVERY_MODES).nullable(),
})

const calendarExceptionSchema = z.object({
  date: z.iso.datetime(),
  type: z.enum(CALENDAR_EXCEPTION_TYPES),
  title: z.string(),
  note: z.string().nullable(),
})

const locationSchema = z.object({
  meetingProvider: z.enum(MEETING_PROVIDERS).nullable(),
  virtualClassNotes: z.string().nullable(),
  venueName: z.string().nullable(),
  addressLine1: z.string().nullable(),
  addressLine2: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  postalCode: z.string().nullable(),
  country: z.string().nullable(),
  room: z.string().nullable(),
  mapUrl: z.string().nullable(),
})

const adminBatchSchema = z.object({
  id: z.string(),
  batchCode: z.string(),
  name: z.string(),
  shortName: z.string().nullable(),
  courseId: z.string(),
  description: z.string(),
  startDate: z.iso.datetime().nullable(),
  endDate: z.iso.datetime().nullable(),
  enrollmentOpenDate: z.iso.datetime().nullable(),
  enrollmentCloseDate: z.iso.datetime().nullable(),
  timezone: z.string(),
  deliveryMode: z.enum(BATCH_DELIVERY_MODES),
  status: z.enum(BATCH_STATUSES),
  primaryTrainerId: z.string().nullable(),
  assistantTrainerIds: z.array(z.string()),
  maxStudents: z.number(),
  occupiedSeats: z.number(),
  availableSeats: z.number(),
  minimumStudents: z.number().nullable(),
  waitlistEnabled: z.boolean(),
  location: locationSchema,
  weeklySchedule: z.array(weeklyScheduleSlotSchema),
  calendarExceptions: z.array(calendarExceptionSchema),
  tags: z.array(z.string()),
  internalNotes: z.string().nullable(),
  scheduledAt: z.iso.datetime().nullable(),
  activatedAt: z.iso.datetime().nullable(),
  completedAt: z.iso.datetime().nullable(),
  cancelledAt: z.iso.datetime().nullable(),
  archivedAt: z.iso.datetime().nullable(),
  isDeleted: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

const readinessSchema = z.object({
  ready: z.boolean(),
  blockers: z.array(z.object({ field: z.string(), code: z.string(), message: z.string() })),
})

const conflictSchema = z.object({
  type: z.enum(['AVAILABILITY', 'CROSS_BATCH']),
  trainerId: z.string(),
  message: z.string(),
  conflictingBatchId: z.string().optional(),
  conflictingBatchCode: z.string().optional(),
})

const bulkActionResultSchema = z.object({
  succeeded: z.array(z.string()),
  failed: z.array(z.object({ id: z.string(), reason: z.string() })),
})

registry.registerPath({
  method: 'get',
  path: '/batches',
  tags: TAGS,
  summary: 'List batches — paginated, filterable, searchable',
  security,
  responses: {
    200: {
      description: 'Paginated batch list',
      content: { 'application/json': { schema: successResponseSchema(z.array(adminBatchSchema)) } },
    },
    ...errorResponses(401, 403),
  },
})

registry.registerPath({
  method: 'get',
  path: '/batches/export',
  tags: TAGS,
  summary: 'Export the filtered batch list as CSV',
  description: 'Returns `text/csv`, not the standard JSON envelope. Capped at 5,000 rows.',
  security,
  responses: {
    200: { description: 'CSV file', content: { 'text/csv': { schema: z.string() } } },
    ...errorResponses(401, 403),
  },
})

registry.registerPath({
  method: 'post',
  path: '/batches',
  tags: TAGS,
  summary: 'Create a batch (always starts as DRAFT) — a server-generated batchCode is assigned',
  security,
  request: { body: jsonBody(z.object({ courseId: z.string(), name: z.string() })) },
  responses: {
    201: {
      description: 'Batch created',
      content: { 'application/json': { schema: successResponseSchema(adminBatchSchema) } },
    },
    ...errorResponses(400, 401, 403),
  },
})

registry.registerPath({
  method: 'get',
  path: '/batches/{id}',
  tags: TAGS,
  summary: 'Get a batch by id',
  security,
  request: idParam,
  responses: {
    200: {
      description: 'Batch',
      content: { 'application/json': { schema: successResponseSchema(adminBatchSchema) } },
    },
    ...errorResponses(401, 403, 404),
  },
})

registry.registerPath({
  method: 'patch',
  path: '/batches/{id}',
  tags: TAGS,
  summary: 'Update a batch — batchCode and courseId are immutable and never accepted here',
  security,
  request: { ...idParam, body: jsonBody(z.object({ name: z.string().optional() })) },
  responses: {
    200: {
      description: 'Batch updated',
      content: { 'application/json': { schema: successResponseSchema(adminBatchSchema) } },
    },
    ...errorResponses(400, 401, 403, 404),
  },
})

registry.registerPath({
  method: 'delete',
  path: '/batches/{id}',
  tags: TAGS,
  summary: 'Soft-delete a batch',
  security,
  request: idParam,
  responses: {
    200: {
      description: 'Batch deleted',
      content: { 'application/json': { schema: successResponseSchema(z.null()) } },
    },
    ...errorResponses(401, 403, 404),
  },
})

registry.registerPath({
  method: 'post',
  path: '/batches/{id}/readiness-check',
  tags: TAGS,
  summary: 'Check scheduling readiness without scheduling',
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
  method: 'get',
  path: '/batches/{id}/conflicts',
  tags: TAGS,
  summary: "Trainer availability/double-booking conflicts for this batch's current configuration",
  security,
  request: idParam,
  responses: {
    200: {
      description: 'Conflicts (empty array if none)',
      content: { 'application/json': { schema: successResponseSchema(z.array(conflictSchema)) } },
    },
    ...errorResponses(401, 403, 404),
  },
})

registry.registerPath({
  method: 'post',
  path: '/batches/{id}/trainers',
  tags: TAGS,
  summary: 'Replace the primary and assistant trainer assignment',
  security,
  request: {
    ...idParam,
    body: jsonBody(
      z.object({
        primaryTrainerId: z.string().nullable(),
        assistantTrainerIds: z.array(z.string()),
      }),
    ),
  },
  responses: {
    200: {
      description: 'Trainers updated',
      content: { 'application/json': { schema: successResponseSchema(adminBatchSchema) } },
    },
    ...errorResponses(400, 401, 403, 404),
  },
})

registry.registerPath({
  method: 'post',
  path: '/batches/{id}/weekly-schedule',
  tags: TAGS,
  summary: 'Replace the recurring weekly timetable (whole-array replace)',
  security,
  request: {
    ...idParam,
    body: jsonBody(z.object({ weeklySchedule: z.array(weeklyScheduleSlotSchema) })),
  },
  responses: {
    200: {
      description: 'Weekly schedule updated',
      content: { 'application/json': { schema: successResponseSchema(adminBatchSchema) } },
    },
    ...errorResponses(400, 401, 403, 404),
  },
})

registry.registerPath({
  method: 'post',
  path: '/batches/{id}/calendar-exceptions',
  tags: TAGS,
  summary: 'Replace the calendar exception (holiday/no-class) list (whole-array replace)',
  security,
  request: {
    ...idParam,
    body: jsonBody(z.object({ calendarExceptions: z.array(calendarExceptionSchema) })),
  },
  responses: {
    200: {
      description: 'Calendar exceptions updated',
      content: { 'application/json': { schema: successResponseSchema(adminBatchSchema) } },
    },
    ...errorResponses(400, 401, 403, 404),
  },
})

const lifecycleSummaries: Record<string, string> = {
  schedule:
    'Move a DRAFT batch to SCHEDULED — rejected with structured blockers if not ready (422)',
  unschedule: 'Move a SCHEDULED batch back to DRAFT',
  activate: 'Move a SCHEDULED batch to ACTIVE',
  complete: 'Move an ACTIVE batch to COMPLETED',
  cancel: 'Cancel a DRAFT/SCHEDULED/ACTIVE batch',
  archive: 'Archive a COMPLETED/CANCELLED batch',
  restore: 'Restore a soft-deleted batch, or move an ARCHIVED batch back to DRAFT',
}

for (const [action, summary] of Object.entries(lifecycleSummaries)) {
  registry.registerPath({
    method: 'post',
    path: `/batches/{id}/lifecycle/${action}`,
    tags: TAGS,
    summary,
    security,
    request: idParam,
    responses: {
      200: {
        description: 'Batch updated',
        content: { 'application/json': { schema: successResponseSchema(adminBatchSchema) } },
      },
      422: {
        description: 'Batch is not ready for this transition',
        content: { 'application/json': { schema: errorResponseSchema } },
      },
      ...errorResponses(401, 403, 404, 409),
    },
  })
}

registry.registerPath({
  method: 'post',
  path: '/batches/{id}/duplicate',
  tags: TAGS,
  summary: 'Duplicate a batch — copies configuration only, never batchCode/status/dates blindly',
  security,
  request: { ...idParam, body: jsonBody(z.object({ name: z.string() })) },
  responses: {
    201: {
      description: 'Batch duplicated (new DRAFT batch)',
      content: { 'application/json': { schema: successResponseSchema(adminBatchSchema) } },
    },
    ...errorResponses(400, 401, 403, 404),
  },
})

registry.registerPath({
  method: 'get',
  path: '/batches/{id}/audit',
  tags: TAGS,
  summary: "A batch's audit timeline",
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

for (const action of ['archive', 'cancel', 'delete']) {
  registry.registerPath({
    method: 'post',
    path: `/batches/bulk/${action}`,
    tags: TAGS,
    summary: `Bulk ${action} batches — per-item results on partial failure`,
    security,
    request: { body: jsonBody(z.object({ action: z.string(), batchIds: z.array(z.string()) })) },
    responses: {
      200: {
        description: 'Bulk action result',
        content: { 'application/json': { schema: successResponseSchema(bulkActionResultSchema) } },
      },
      ...errorResponses(400, 401, 403),
    },
  })
}
