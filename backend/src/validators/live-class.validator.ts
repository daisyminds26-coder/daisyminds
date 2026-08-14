import { z } from 'zod'

import {
  LIVE_CLASS_DELIVERY_MODES,
  LIVE_CLASS_PROVIDERS,
  LIVE_CLASS_STATUSES,
} from '../models/live-class.model'
import { isValidTimeZone } from '../utils/timezone'

const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id')
const timeZoneSchema = z
  .string()
  .trim()
  .min(1)
  .refine(isValidTimeZone, { message: 'Enter a valid IANA timezone (e.g. Asia/Kolkata)' })

export const liveClassIdParamSchema = z.object({ id: objectIdSchema }).strict()
export type LiveClassIdParam = z.infer<typeof liveClassIdParamSchema>

const venueSchema = z
  .object({
    venueName: z.string().trim().max(200).optional(),
    addressLine1: z.string().trim().max(200).optional(),
    addressLine2: z.string().trim().max(200).optional(),
    city: z.string().trim().max(100).optional(),
    state: z.string().trim().max(100).optional(),
    postalCode: z.string().trim().max(20).optional(),
    country: z.string().trim().max(100).optional(),
    room: z.string().trim().max(100).optional(),
    mapUrl: z.string().trim().max(500).optional(),
  })
  .strict()

const baseSessionFields = {
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  startDateTime: z.coerce.date(),
  endDateTime: z.coerce.date(),
  timezone: timeZoneSchema,
  deliveryMode: z.enum(LIVE_CLASS_DELIVERY_MODES),
  provider: z.enum(LIVE_CLASS_PROVIDERS),
  joinUrl: z.string().trim().max(1000).optional(),
  hostUrl: z.string().trim().max(1000).optional(),
  venue: venueSchema.optional(),
  trainerIds: z.array(objectIdSchema).max(10).default([]),
  primaryTrainerId: objectIdSchema.optional(),
  /** Required only when the service detects the session falls outside the batch's date range or on a calendar-exception date — enforced in `live-class.service.ts`, not here (a Zod-level requirement can't see the batch). */
  overrideReason: z.string().trim().max(500).optional(),
}

export const createLiveClassSchema = z
  .object({ batchId: objectIdSchema, ...baseSessionFields })
  .strict()
  .refine((value) => value.startDateTime < value.endDateTime, {
    message: 'Start time must be before end time',
    path: ['endDateTime'],
  })
export type CreateLiveClassInput = z.infer<typeof createLiveClassSchema>

export const updateLiveClassSchema = z
  .object(baseSessionFields)
  .partial()
  .strict()
  .refine(
    (value) =>
      !value.startDateTime || !value.endDateTime || value.startDateTime < value.endDateTime,
    { message: 'Start time must be before end time', path: ['endDateTime'] },
  )
export type UpdateLiveClassInput = z.infer<typeof updateLiveClassSchema>

export const cancelLiveClassSchema = z
  .object({ reason: z.string().trim().min(1, 'A cancellation reason is required').max(500) })
  .strict()
export type CancelLiveClassInput = z.infer<typeof cancelLiveClassSchema>

export const listLiveClassesQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sort: z
      .string()
      .regex(/^(startDateTime|createdAt):(asc|desc)$/)
      .default('startDateTime:asc')
      .transform((value) => {
        const [field, direction] = value.split(':') as [
          'startDateTime' | 'createdAt',
          'asc' | 'desc',
        ]
        return { field, direction }
      }),
    batchId: objectIdSchema.optional(),
    courseId: objectIdSchema.optional(),
    trainerId: objectIdSchema.optional(),
    status: z.enum(LIVE_CLASS_STATUSES).optional(),
    provider: z.enum(LIVE_CLASS_PROVIDERS).optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    search: z.string().trim().max(200).optional(),
  })
  .strict()
export type ListLiveClassesQuery = z.infer<typeof listLiveClassesQuerySchema>

export const generatePreviewSchema = z
  .object({
    batchId: objectIdSchema,
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .strict()
  .refine((value) => value.startDate <= value.endDate, {
    message: 'Start date must be before end date',
    path: ['endDate'],
  })
export type GeneratePreviewInput = z.infer<typeof generatePreviewSchema>

export const generateCreateSchema = z
  .object({
    batchId: objectIdSchema,
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    /** ISO date strings (`yyyy-mm-dd`) selecting which previewed occurrences to actually create — omit to create every non-duplicate occurrence in range. */
    scheduledDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  })
  .strict()
  .refine((value) => value.startDate <= value.endDate, {
    message: 'Start date must be before end date',
    path: ['endDate'],
  })
export type GenerateCreateInput = z.infer<typeof generateCreateSchema>
