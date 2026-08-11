import { z } from 'zod'

import {
  BATCH_DELIVERY_MODES,
  CALENDAR_EXCEPTION_TYPES,
  DAYS_OF_WEEK,
  MEETING_PROVIDERS,
} from '@/features/batches/types'

/**
 * Number fields stay validated **strings** end-to-end, dates stay plain
 * `z.date()` — mirrors `features/courses/schemas/course.schemas.ts`'s
 * documented reasoning (coercion breaks `useForm<T>()`'s single-generic
 * `Control<T>` inference every shared `*Field` component depends on).
 */
const numericString = (max: number) =>
  z
    .string()
    .trim()
    .regex(/^\d*\.?\d*$/, 'Numbers only')
    .max(max)
    .optional()
    .or(z.literal(''))

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour HH:mm format')

const httpsUrlSchema = z
  .url('Enter a valid URL')
  .refine((value) => value.startsWith('https://'), { message: 'URL must start with https://' })

const shortStringArray = (maxItemLength: number, maxItems: number) =>
  z.array(z.string().trim().min(1).max(maxItemLength)).max(maxItems)

/**
 * Deliberately **without** cross-field `.superRefine()` rules (end-after-
 * start, no same-day overlap, minimum <= maximum capacity, primary-not-
 * also-assistant) — same reasoning as `course.schemas.ts`'s `pricingSchema`
 * comment: any `.refine()`/`.superRefine()` anywhere in this schema tree
 * turns that branch into a `ZodEffects` wrapper that breaks `zodResolver`'s
 * generic inference for every `Control<T>`-typed `*Field` component on a
 * form this large. The backend re-validates every one of these rules
 * regardless (never trust frontend input) — a violation surfaces as an API
 * error toast on submit instead of inline, an acceptable tradeoff here.
 */
const weeklyScheduleSlotSchema = z
  .object({
    dayOfWeek: z.enum(DAYS_OF_WEEK),
    startTime: timeSchema,
    endTime: timeSchema,
    sessionLabel: z.string().trim().max(150).optional().or(z.literal('')),
    locationOverride: z.string().trim().max(200).optional().or(z.literal('')),
    deliveryModeOverride: z.enum(BATCH_DELIVERY_MODES).optional(),
  })
  .strict()

export const weeklyScheduleSchema = z.array(weeklyScheduleSlotSchema).max(30).default([])
export type WeeklyScheduleFormValues = z.input<typeof weeklyScheduleSchema>
export type WeeklyScheduleSlotFormValues = z.input<typeof weeklyScheduleSlotSchema>

const calendarExceptionSchema = z
  .object({
    date: z.date(),
    type: z.enum(CALENDAR_EXCEPTION_TYPES).default('HOLIDAY'),
    title: z.string().trim().min(1, 'Title is required').max(150),
    note: z.string().trim().max(500).optional().or(z.literal('')),
  })
  .strict()

export const calendarExceptionsSchema = z.array(calendarExceptionSchema).max(100).default([])
export type CalendarExceptionsFormValues = z.input<typeof calendarExceptionsSchema>
export type CalendarExceptionFormValues = z.input<typeof calendarExceptionSchema>

const locationSchema = z
  .object({
    meetingProvider: z.enum(MEETING_PROVIDERS).optional(),
    virtualClassNotes: z.string().trim().max(500).optional().or(z.literal('')),
    venueName: z.string().trim().max(200).optional().or(z.literal('')),
    addressLine1: z.string().trim().max(200).optional().or(z.literal('')),
    addressLine2: z.string().trim().max(200).optional().or(z.literal('')),
    city: z.string().trim().max(100).optional().or(z.literal('')),
    state: z.string().trim().max(100).optional().or(z.literal('')),
    postalCode: z.string().trim().max(20).optional().or(z.literal('')),
    country: z.string().trim().max(100).optional().or(z.literal('')),
    room: z.string().trim().max(100).optional().or(z.literal('')),
    mapUrl: httpsUrlSchema.optional().or(z.literal('')),
  })
  .strict()

export const batchProfileSchema = z
  .object({
    courseId: z.string().min(1, 'Select a course'),
    name: z.string().trim().min(1, 'Name is required').max(150),
    shortName: z.string().trim().max(60).optional().or(z.literal('')),
    description: z.string().trim().max(2000).optional().or(z.literal('')),

    startDate: z.date().optional(),
    endDate: z.date().optional(),
    enrollmentOpenDate: z.date().optional(),
    enrollmentCloseDate: z.date().optional(),
    timezone: z.string().trim().min(1, 'Timezone is required').max(60),

    deliveryMode: z.enum(BATCH_DELIVERY_MODES),

    primaryTrainerId: z.string().optional().or(z.literal('')),
    assistantTrainerIds: z.array(z.string()).max(10).default([]),

    maxStudents: z.string().trim().regex(/^\d+$/, 'Numbers only').max(6),
    minimumStudents: numericString(6),
    waitlistEnabled: z.boolean().default(false),

    location: locationSchema.default({}),

    weeklySchedule: weeklyScheduleSchema,
    calendarExceptions: calendarExceptionsSchema,

    tags: shortStringArray(40, 20).default([]),
    internalNotes: z.string().trim().max(2000).optional().or(z.literal('')),
  })
  .strict()

export const createBatchSchema = batchProfileSchema
export type CreateBatchFormValues = z.input<typeof createBatchSchema>

/** The edit form is flat and always submits every field's current value — same shape as the create schema minus `courseId`, mirroring `course.schemas.ts`'s `updateCourseSchema`. */
export const updateBatchSchema = batchProfileSchema.omit({ courseId: true })
export type UpdateBatchFormValues = z.input<typeof updateBatchSchema>

export const duplicateBatchSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(150),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
  })
  .strict()
export type DuplicateBatchFormValues = z.input<typeof duplicateBatchSchema>
