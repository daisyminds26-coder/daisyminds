import { z } from 'zod'

import { DASHBOARD_RANGES, MAX_CUSTOM_RANGE_MS } from '../utils/date-range'
import { isValidTimeZone } from '../utils/timezone'

const DEFAULT_TIMEZONE = 'Asia/Kolkata'

/**
 * `startDate`/`endDate` are only meaningful (and only required) when
 * `range: 'CUSTOM'` — enforced below via `.superRefine` rather than a Zod
 * discriminated union, since every other field is shared and a union would
 * force duplicating the whole schema for one conditional pair.
 */
export const adminDashboardQuerySchema = z
  .object({
    range: z.enum(DASHBOARD_RANGES).default('LAST_30_DAYS'),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    timezone: z
      .string()
      .trim()
      .min(1)
      .max(60)
      .default(DEFAULT_TIMEZONE)
      .refine(isValidTimeZone, { message: 'Unrecognized IANA time zone' }),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.range !== 'CUSTOM') return

    if (!value.startDate) {
      ctx.addIssue({
        code: 'custom',
        message: 'startDate is required when range is CUSTOM',
        path: ['startDate'],
      })
    }
    if (!value.endDate) {
      ctx.addIssue({
        code: 'custom',
        message: 'endDate is required when range is CUSTOM',
        path: ['endDate'],
      })
    }
    if (value.startDate && value.endDate && value.startDate > value.endDate) {
      ctx.addIssue({
        code: 'custom',
        message: 'startDate must not be after endDate',
        path: ['endDate'],
      })
    }
    if (
      value.startDate &&
      value.endDate &&
      value.endDate.getTime() - value.startDate.getTime() > MAX_CUSTOM_RANGE_MS
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Custom date range cannot exceed 366 days',
        path: ['endDate'],
      })
    }
  })

export type AdminDashboardQuery = z.infer<typeof adminDashboardQuerySchema>
