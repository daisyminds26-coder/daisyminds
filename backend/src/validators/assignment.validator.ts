import { z } from 'zod'

import { ASSIGNMENT_STATUSES, ASSIGNMENT_SUBMISSION_TYPES } from '../models/assignment.model'
import { isValidTimeZone } from '../utils/timezone'

const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id')
const timeZoneSchema = z
  .string()
  .trim()
  .min(1)
  .refine(isValidTimeZone, { message: 'Enter a valid IANA timezone (e.g. Asia/Kolkata)' })

export const assignmentIdParamSchema = z.object({ id: objectIdSchema }).strict()
export type AssignmentIdParam = z.infer<typeof assignmentIdParamSchema>

const baseAssignmentFields = {
  title: z.string().trim().min(1).max(200),
  shortDescription: z.string().trim().max(300).optional(),
  instructions: z.string().trim().max(10_000),
  batchIds: z.array(objectIdSchema).min(1).max(50),
  submissionType: z.enum(ASSIGNMENT_SUBMISSION_TYPES),
  allowedFileTypes: z.array(z.string().trim().toLowerCase().max(10)).max(20).default([]),
  maxFiles: z.coerce.number().int().min(1).max(10).default(1),
  maxFileSizeBytes: z.coerce
    .number()
    .int()
    .positive()
    .max(100 * 1024 * 1024)
    .default(25 * 1024 * 1024),
  maxMarks: z.coerce.number().positive(),
  passingMarks: z.coerce.number().min(0).optional(),
  dueDateTime: z.coerce.date(),
  timezone: timeZoneSchema,
  allowLateSubmission: z.boolean().default(false),
  lateUntil: z.coerce.date().optional(),
  allowResubmission: z.boolean().default(false),
  maxAttempts: z.coerce.number().int().positive().max(20).optional(),
}

export const createAssignmentSchema = z
  .object({ courseId: objectIdSchema, ...baseAssignmentFields })
  .strict()
  .refine((value) => !value.passingMarks || value.passingMarks <= value.maxMarks, {
    message: 'Passing marks cannot exceed max marks',
    path: ['passingMarks'],
  })
  .refine(
    (value) =>
      !value.allowLateSubmission || !value.lateUntil || value.lateUntil > value.dueDateTime,
    {
      message: 'Late-until must be after the due date',
      path: ['lateUntil'],
    },
  )
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>

export const updateAssignmentSchema = z
  .object(baseAssignmentFields)
  .partial()
  .strict()
  .refine(
    (value) => !value.passingMarks || !value.maxMarks || value.passingMarks <= value.maxMarks,
    { message: 'Passing marks cannot exceed max marks', path: ['passingMarks'] },
  )
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>

export const cancelAssignmentSchema = z
  .object({ reason: z.string().trim().min(1, 'A cancellation reason is required').max(500) })
  .strict()
export type CancelAssignmentInput = z.infer<typeof cancelAssignmentSchema>

export const listAssignmentsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sort: z
      .string()
      .regex(/^(dueDateTime|createdAt):(asc|desc)$/)
      .default('dueDateTime:desc')
      .transform((value) => {
        const [field, direction] = value.split(':') as ['dueDateTime' | 'createdAt', 'asc' | 'desc']
        return { field, direction }
      }),
    courseId: objectIdSchema.optional(),
    batchId: objectIdSchema.optional(),
    status: z.enum(ASSIGNMENT_STATUSES).optional(),
    search: z.string().trim().max(200).optional(),
  })
  .strict()
export type ListAssignmentsQuery = z.infer<typeof listAssignmentsQuerySchema>

export const confirmAttachmentSchema = z
  .object({
    publicId: z.string().trim().min(1),
    filename: z.string().trim().min(1).max(255),
  })
  .strict()
export type ConfirmAttachmentInput = z.infer<typeof confirmAttachmentSchema>

export const attachmentIdParamSchema = z
  .object({ id: objectIdSchema, attachmentId: objectIdSchema })
  .strict()
export type AttachmentIdParam = z.infer<typeof attachmentIdParamSchema>
