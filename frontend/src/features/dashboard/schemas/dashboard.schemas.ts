import { z } from 'zod'

import { DASHBOARD_RANGES } from '@/features/dashboard/types'

/** Client-side mirror of `backend/src/validators/dashboard.validator.ts`'s CUSTOM-range rule — the period selector validates before firing a request, the backend re-validates regardless (never trust frontend input). */
export const customRangeSchema = z
  .object({
    startDate: z.date(),
    endDate: z.date(),
  })
  .refine((value) => value.startDate <= value.endDate, {
    message: 'Start date must not be after end date',
    path: ['endDate'],
  })

export type CustomRangeFormValues = z.infer<typeof customRangeSchema>

export const dashboardRangeSchema = z.enum(DASHBOARD_RANGES)
