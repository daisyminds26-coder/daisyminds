import { z } from 'zod'

import { ATTENDANCE_STATUSES } from '../models/attendance.model'

const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id')

export const sessionIdParamSchema = z.object({ id: objectIdSchema }).strict()
export type SessionIdParam = z.infer<typeof sessionIdParamSchema>

export const bulkMarkAttendanceSchema = z
  .object({
    records: z
      .array(
        z
          .object({
            studentId: objectIdSchema,
            status: z.enum(ATTENDANCE_STATUSES),
            notes: z.string().trim().max(500).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(500),
  })
  .strict()
export type BulkMarkAttendanceInput = z.infer<typeof bulkMarkAttendanceSchema>

export const reopenAttendanceSchema = z
  .object({
    reason: z.string().trim().min(1, 'A reason is required to reopen attendance').max(500),
  })
  .strict()
export type ReopenAttendanceInput = z.infer<typeof reopenAttendanceSchema>

export const listAttendanceQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(200).default(50),
    batchId: objectIdSchema.optional(),
    courseId: objectIdSchema.optional(),
    studentId: objectIdSchema.optional(),
    sessionId: objectIdSchema.optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
  })
  .strict()
export type ListAttendanceQuery = z.infer<typeof listAttendanceQuerySchema>

export const exportAttendanceQuerySchema = listAttendanceQuerySchema.omit({
  page: true,
  limit: true,
})
export type ExportAttendanceQuery = z.infer<typeof exportAttendanceQuerySchema>
