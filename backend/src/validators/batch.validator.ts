import { z } from 'zod'

import {
  BATCH_DELIVERY_MODES,
  BATCH_STATUSES,
  CALENDAR_EXCEPTION_TYPES,
  DAYS_OF_WEEK,
  MEETING_PROVIDERS,
} from '../models/batch.model'
import { isValidTimeZone } from '../utils/timezone'
import { findOverlappingSlotPairs } from '../utils/schedule-overlap.util'

const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id')
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour HH:mm format')

export const batchIdParamSchema = z.object({ id: objectIdSchema }).strict()
export type BatchIdParam = z.infer<typeof batchIdParamSchema>

const MAX_WEEKLY_SLOTS = 30
const MAX_CALENDAR_EXCEPTIONS = 100
const MAX_ASSISTANT_TRAINERS = 10

const timeZoneSchema = z
  .string()
  .trim()
  .min(1, 'Timezone is required')
  .max(60)
  .refine(isValidTimeZone, { message: 'Enter a valid IANA timezone (e.g. Asia/Kolkata)' })

const httpsUrlSchema = z
  .url('Enter a valid URL')
  .refine((value) => value.startsWith('https://'), { message: 'URL must start with https://' })
  .refine((value) => value.length <= 500, { message: 'URL is too long' })

const weeklyScheduleSlotSchema = z
  .object({
    dayOfWeek: z.enum(DAYS_OF_WEEK),
    startTime: timeSchema,
    endTime: timeSchema,
    sessionLabel: z.string().trim().max(150).optional(),
    locationOverride: z.string().trim().max(200).optional(),
    deliveryModeOverride: z.enum(BATCH_DELIVERY_MODES).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.startTime >= value.endTime) {
      ctx.addIssue({
        code: 'custom',
        message: 'Start time must be before end time',
        path: ['endTime'],
      })
    }
  })

/**
 * No `.default()` here — `batchBaseSchema` (shared by create and update)
 * needs the bare, undefaulted array so that `updateBatchSchema`'s
 * `.partial()` leaves an omitted `weeklySchedule` key genuinely absent
 * (`undefined`, "leave unchanged") rather than silently replacing it with
 * `[]`. `.default([])` is layered on top of this only where "omitted means
 * empty" is actually the desired semantics: `weeklyScheduleSchema` below
 * (create, and the whole-array-replace `PUT /:id/weekly-schedule` body).
 */
const weeklyScheduleItemsSchema = z
  .array(weeklyScheduleSlotSchema)
  .max(MAX_WEEKLY_SLOTS, `A batch can have at most ${String(MAX_WEEKLY_SLOTS)} weekly slots`)
  .superRefine((slots, ctx) => {
    const overlaps = findOverlappingSlotPairs(slots)
    for (const [i, j] of overlaps) {
      ctx.addIssue({
        code: 'custom',
        message: `Slot ${String(i + 1)} overlaps with slot ${String(j + 1)} on the same day`,
        path: [j],
      })
    }
  })

/** Shared by `createBatchSchema` and the standalone `PUT /:id/weekly-schedule` body — a full-array replace, matching this app's established "compact, whole-set, never partial" reorder/replace contract (API-STANDARDS.md §4). Never used by `updateBatchSchema` — see `weeklyScheduleItemsSchema`'s comment. */
export const weeklyScheduleSchema = weeklyScheduleItemsSchema.default([])
export type WeeklyScheduleInput = z.infer<typeof weeklyScheduleSchema>

const calendarExceptionSchema = z
  .object({
    date: z.coerce.date(),
    type: z.enum(CALENDAR_EXCEPTION_TYPES).default('HOLIDAY'),
    title: z.string().trim().min(1, 'Title is required').max(150),
    note: z.string().trim().max(500).optional(),
  })
  .strict()

/** No `.default()` — same reasoning as `weeklyScheduleItemsSchema` above. */
const calendarExceptionItemsSchema = z
  .array(calendarExceptionSchema)
  .max(
    MAX_CALENDAR_EXCEPTIONS,
    `A batch can have at most ${String(MAX_CALENDAR_EXCEPTIONS)} calendar exceptions`,
  )
  .superRefine((exceptions, ctx) => {
    const seen = new Set<string>()
    exceptions.forEach((exception, index) => {
      const key = exception.date.toISOString().slice(0, 10)
      if (seen.has(key)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Duplicate exception date',
          path: [index, 'date'],
        })
      }
      seen.add(key)
    })
  })

/** Shared by `createBatchSchema` and the standalone `PUT /:id/calendar-exceptions` body. Never used by `updateBatchSchema` — see `weeklyScheduleItemsSchema`'s comment. */
export const calendarExceptionsSchema = calendarExceptionItemsSchema.default([])
export type CalendarExceptionsInput = z.infer<typeof calendarExceptionsSchema>

const locationSchema = z
  .object({
    meetingProvider: z.enum(MEETING_PROVIDERS).optional(),
    virtualClassNotes: z.string().trim().max(500).optional(),
    venueName: z.string().trim().max(200).optional(),
    addressLine1: z.string().trim().max(200).optional(),
    addressLine2: z.string().trim().max(200).optional(),
    city: z.string().trim().max(100).optional(),
    state: z.string().trim().max(100).optional(),
    postalCode: z.string().trim().max(20).optional(),
    country: z.string().trim().max(100).optional(),
    room: z.string().trim().max(100).optional(),
    mapUrl: httpsUrlSchema.optional(),
  })
  .strict()
export type LocationInput = z.infer<typeof locationSchema>

function shortStringArray(maxItemLength: number, maxItems: number) {
  return z.array(z.string().trim().min(1).max(maxItemLength)).max(maxItems)
}

/**
 * Zod v4 disallows `.partial()` on a schema that already carries a
 * `.superRefine()` — same constraint `course.validator.ts` documents — so
 * the base object stays unrefined and the cross-field date/capacity/
 * trainer checks are re-applied after `.partial()` for the update schema.
 *
 * Every field here is bare `.optional()` — deliberately **no `.default()`**
 * on `assistantTrainerIds`/`waitlistEnabled`/`weeklySchedule`/
 * `calendarExceptions`/`tags`, unlike earlier drafts of this file. A
 * `.default()` on a field short-circuits `.partial()`: Zod substitutes the
 * default the moment a key is `undefined`, regardless of whether the field
 * is otherwise optional, so `updateBatchSchema`'s PATCH body would silently
 * reset any omitted one of these to empty/false on every single update —
 * a real data-loss bug caught by the test suite. `createBatchSchema` below
 * re-adds `.default()` to these five fields via `.extend()`, since "omitted
 * at creation" genuinely should mean "start empty."
 */
const batchBaseSchema = z
  .object({
    courseId: objectIdSchema,
    name: z.string().trim().min(1, 'Name is required').max(150),
    shortName: z.string().trim().max(60).optional(),
    description: z.string().trim().max(2000).optional(),

    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    enrollmentOpenDate: z.coerce.date().optional(),
    enrollmentCloseDate: z.coerce.date().optional(),
    timezone: timeZoneSchema,

    deliveryMode: z.enum(BATCH_DELIVERY_MODES),

    primaryTrainerId: objectIdSchema.optional(),
    assistantTrainerIds: z.array(objectIdSchema).max(MAX_ASSISTANT_TRAINERS).optional(),

    maxStudents: z.coerce.number().int().positive().max(10_000),
    minimumStudents: z.coerce.number().int().min(0).optional(),
    waitlistEnabled: z.boolean().optional(),

    location: locationSchema.optional(),

    weeklySchedule: weeklyScheduleItemsSchema.optional(),
    calendarExceptions: calendarExceptionItemsSchema.optional(),

    tags: shortStringArray(40, 20).optional(),
    internalNotes: z.string().trim().max(2000).optional(),
  })
  .strict()

function requireDateAndTrainerCoherence(
  value: {
    startDate?: Date
    endDate?: Date
    minimumStudents?: number
    maxStudents?: number
    primaryTrainerId?: string
    assistantTrainerIds?: string[]
  },
  ctx: z.RefinementCtx,
): void {
  if (value.startDate && value.endDate && value.endDate <= value.startDate) {
    ctx.addIssue({
      code: 'custom',
      message: 'End date must be after the start date',
      path: ['endDate'],
    })
  }
  if (
    value.minimumStudents !== undefined &&
    value.maxStudents !== undefined &&
    value.minimumStudents > value.maxStudents
  ) {
    ctx.addIssue({
      code: 'custom',
      message: 'Minimum students cannot exceed maximum students',
      path: ['minimumStudents'],
    })
  }
  if (value.assistantTrainerIds) {
    if (new Set(value.assistantTrainerIds).size !== value.assistantTrainerIds.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'Duplicate assistant trainer',
        path: ['assistantTrainerIds'],
      })
    }
    if (value.primaryTrainerId && value.assistantTrainerIds.includes(value.primaryTrainerId)) {
      ctx.addIssue({
        code: 'custom',
        message: 'The primary trainer cannot also be listed as an assistant',
        path: ['assistantTrainerIds'],
      })
    }
  }
}

export const createBatchSchema = batchBaseSchema
  .extend({
    assistantTrainerIds: z.array(objectIdSchema).max(MAX_ASSISTANT_TRAINERS).default([]),
    waitlistEnabled: z.boolean().default(false),
    weeklySchedule: weeklyScheduleItemsSchema.default([]),
    calendarExceptions: calendarExceptionItemsSchema.default([]),
    tags: shortStringArray(40, 20).default([]),
  })
  .strict()
  .superRefine(requireDateAndTrainerCoherence)
export type CreateBatchInput = z.infer<typeof createBatchSchema>

/** `courseId` is never part of this schema — immutable by construction, same as `courseCode` on `course.validator.ts#updateCourseSchema`. */
export const updateBatchSchema = batchBaseSchema
  .omit({ courseId: true })
  .partial()
  .strict()
  .superRefine(requireDateAndTrainerCoherence)
export type UpdateBatchInput = z.infer<typeof updateBatchSchema>

export const assignTrainersSchema = z
  .object({
    primaryTrainerId: objectIdSchema.nullable(),
    assistantTrainerIds: z.array(objectIdSchema).max(MAX_ASSISTANT_TRAINERS).default([]),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (new Set(value.assistantTrainerIds).size !== value.assistantTrainerIds.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'Duplicate assistant trainer',
        path: ['assistantTrainerIds'],
      })
    }
    if (value.primaryTrainerId && value.assistantTrainerIds.includes(value.primaryTrainerId)) {
      ctx.addIssue({
        code: 'custom',
        message: 'The primary trainer cannot also be listed as an assistant',
        path: ['assistantTrainerIds'],
      })
    }
  })
export type AssignTrainersInput = z.infer<typeof assignTrainersSchema>

export const weeklyScheduleBodySchema = z.object({ weeklySchedule: weeklyScheduleSchema }).strict()
export type WeeklyScheduleBodyInput = z.infer<typeof weeklyScheduleBodySchema>

export const calendarExceptionsBodySchema = z
  .object({ calendarExceptions: calendarExceptionsSchema })
  .strict()
export type CalendarExceptionsBodyInput = z.infer<typeof calendarExceptionsBodySchema>

type SortableField =
  | 'batchCode'
  | 'name'
  | 'startDate'
  | 'endDate'
  | 'createdAt'
  | 'updatedAt'
  | 'status'
  | 'maxStudents'

export const listBatchesQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sort: z
      .string()
      .regex(
        /^(batchCode|name|startDate|endDate|createdAt|updatedAt|status|maxStudents):(asc|desc)$/,
      )
      .default('createdAt:desc')
      .transform((value) => {
        const [field, direction] = value.split(':') as [SortableField, 'asc' | 'desc']
        return { field, direction }
      }),
    status: z.enum(BATCH_STATUSES).optional(),
    courseId: objectIdSchema.optional(),
    primaryTrainerId: objectIdSchema.optional(),
    deliveryMode: z.enum(BATCH_DELIVERY_MODES).optional(),
    timezone: z.string().trim().min(1).max(60).optional(),
    startDateFrom: z.coerce.date().optional(),
    startDateTo: z.coerce.date().optional(),
    endDateFrom: z.coerce.date().optional(),
    endDateTo: z.coerce.date().optional(),
    temporal: z.enum(['upcoming', 'current', 'past']).optional(),
    minCapacity: z.coerce.number().int().min(0).optional(),
    maxCapacity: z.coerce.number().int().min(0).optional(),
    waitlistEnabled: z.coerce.boolean().optional(),
    createdFrom: z.coerce.date().optional(),
    createdTo: z.coerce.date().optional(),
    search: z.string().trim().min(1).max(254).optional(),
    includeDeleted: z.coerce.boolean().default(false),
  })
  .strict()
export type ListBatchesQuery = z.infer<typeof listBatchesQuerySchema>

export const exportBatchesQuerySchema = listBatchesQuerySchema.omit({ page: true, limit: true })
export type ExportBatchesQuery = z.infer<typeof exportBatchesQuerySchema>

export const paginationQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict()
export type PaginationQuery = z.infer<typeof paginationQuerySchema>

export const BATCH_BULK_ACTIONS = ['archive', 'cancel', 'delete'] as const
export type BatchBulkAction = (typeof BATCH_BULK_ACTIONS)[number]

export const batchBulkActionSchema = z
  .object({
    action: z.enum(BATCH_BULK_ACTIONS),
    batchIds: z.array(objectIdSchema).min(1).max(100),
  })
  .strict()
export type BatchBulkActionInput = z.infer<typeof batchBulkActionSchema>

export const duplicateBatchSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(150),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.startDate && value.endDate && value.endDate <= value.startDate) {
      ctx.addIssue({
        code: 'custom',
        message: 'End date must be after the start date',
        path: ['endDate'],
      })
    }
  })
export type DuplicateBatchInput = z.infer<typeof duplicateBatchSchema>
