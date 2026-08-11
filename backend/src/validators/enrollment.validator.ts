import { z } from 'zod'

import { ENROLLMENT_SOURCES, ENROLLMENT_STATUSES } from '../models/enrollment.model'

const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id')

export const enrollmentIdParamSchema = z.object({ id: objectIdSchema }).strict()
export type EnrollmentIdParam = z.infer<typeof enrollmentIdParamSchema>

const MAX_BULK_SIZE = 100

/**
 * `courseId`/`status`/`source`/`occupiedSeats`/every lifecycle timestamp are
 * deliberately never accepted here — `courseId` is always server-derived
 * from the batch (task's own explicit rule), `status` only ever changes via
 * the dedicated lifecycle endpoints below (never a generic PATCH), and
 * `source` is set by which endpoint is called (`ADMIN` for this one,
 * `BULK_IMPORT`/`TRANSFER` set internally elsewhere) — never client-chosen,
 * so a caller can never mislabel how an enrollment was actually created.
 */
export const createEnrollmentSchema = z
  .object({
    studentId: objectIdSchema,
    batchId: objectIdSchema,
    enrollmentDate: z.coerce.date().optional(),
    internalNotes: z.string().trim().max(2000).optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  })
  .strict()
export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>

export const cancelEnrollmentSchema = z
  .object({ reason: z.string().trim().max(500).optional() })
  .strict()
export type CancelEnrollmentInput = z.infer<typeof cancelEnrollmentSchema>

export const dropEnrollmentSchema = z
  .object({ reason: z.string().trim().max(500).optional() })
  .strict()
export type DropEnrollmentInput = z.infer<typeof dropEnrollmentSchema>

export const transferEnrollmentSchema = z
  .object({
    targetBatchId: objectIdSchema,
    reason: z.string().trim().max(500).optional(),
  })
  .strict()
export type TransferEnrollmentInput = z.infer<typeof transferEnrollmentSchema>

type SortableField =
  'createdAt' | 'enrollmentCode' | 'status' | 'enrollmentDate' | 'activatedAt' | 'completedAt'

export const listEnrollmentsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sort: z
      .string()
      .regex(
        /^(createdAt|enrollmentCode|status|enrollmentDate|activatedAt|completedAt):(asc|desc)$/,
      )
      .default('createdAt:desc')
      .transform((value) => {
        const [field, direction] = value.split(':') as [SortableField, 'asc' | 'desc']
        return { field, direction }
      }),
    status: z.enum(ENROLLMENT_STATUSES).optional(),
    studentId: objectIdSchema.optional(),
    batchId: objectIdSchema.optional(),
    courseId: objectIdSchema.optional(),
    source: z.enum(ENROLLMENT_SOURCES).optional(),
    search: z.string().trim().min(1).max(254).optional(),
    createdFrom: z.coerce.date().optional(),
    createdTo: z.coerce.date().optional(),
    includeDeleted: z.coerce.boolean().default(false),
  })
  .strict()
export type ListEnrollmentsQuery = z.infer<typeof listEnrollmentsQuerySchema>

export const exportEnrollmentsQuerySchema = listEnrollmentsQuerySchema.omit({
  page: true,
  limit: true,
})
export type ExportEnrollmentsQuery = z.infer<typeof exportEnrollmentsQuerySchema>

export const paginationQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict()
export type PaginationQuery = z.infer<typeof paginationQuerySchema>

export const bulkEnrollSchema = z
  .object({
    batchId: objectIdSchema,
    studentIds: z.array(objectIdSchema).min(1).max(MAX_BULK_SIZE),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (new Set(value.studentIds).size !== value.studentIds.length) {
      ctx.addIssue({ code: 'custom', message: 'Duplicate student id', path: ['studentIds'] })
    }
  })
export type BulkEnrollInput = z.infer<typeof bulkEnrollSchema>

export const bulkLifecycleActionSchema = z
  .object({
    enrollmentIds: z.array(objectIdSchema).min(1).max(MAX_BULK_SIZE),
    reason: z.string().trim().max(500).optional(),
  })
  .strict()
export type BulkLifecycleActionInput = z.infer<typeof bulkLifecycleActionSchema>
