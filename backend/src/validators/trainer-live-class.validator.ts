import { z } from 'zod'

import { LIVE_CLASS_STATUSES } from '../models/live-class.model'
import { bulkMarkAttendanceSchema } from './attendance.validator'

const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id')

export const trainerSessionIdParamSchema = z.object({ id: objectIdSchema }).strict()
export type TrainerSessionIdParam = z.infer<typeof trainerSessionIdParamSchema>

export const trainerListLiveClassesQuerySchema = z
  .object({
    batchId: objectIdSchema.optional(),
    courseId: objectIdSchema.optional(),
    status: z.enum(LIVE_CLASS_STATUSES).optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
  })
  .strict()
export type TrainerListLiveClassesQuery = z.infer<typeof trainerListLiveClassesQuerySchema>

export { bulkMarkAttendanceSchema as trainerMarkAttendanceSchema }
