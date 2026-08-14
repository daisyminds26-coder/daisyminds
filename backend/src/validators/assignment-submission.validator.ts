import { z } from 'zod'

const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id')

export const submissionIdParamSchema = z
  .object({ id: objectIdSchema, submissionId: objectIdSchema })
  .strict()
export type SubmissionIdParam = z.infer<typeof submissionIdParamSchema>

export const assignmentSubmissionsParamSchema = z.object({ id: objectIdSchema }).strict()
export type AssignmentSubmissionsParam = z.infer<typeof assignmentSubmissionsParamSchema>

export const assignmentStudentParamSchema = z
  .object({ id: objectIdSchema, studentId: objectIdSchema })
  .strict()
export type AssignmentStudentParam = z.infer<typeof assignmentStudentParamSchema>

export const listSubmissionsQuerySchema = z
  .object({
    status: z.enum(['SUBMITTED', 'GRADED']).optional(),
    lateOnly: z.coerce.boolean().optional(),
    search: z.string().trim().max(200).optional(),
  })
  .strict()
export type ListSubmissionsQuery = z.infer<typeof listSubmissionsQuerySchema>

export const gradeSubmissionSchema = z
  .object({
    marksAwarded: z.coerce.number().min(0),
    feedback: z.string().trim().max(3000).optional(),
  })
  .strict()
export type GradeSubmissionInput = z.infer<typeof gradeSubmissionSchema>

export const exportSubmissionsQuerySchema = z
  .object({
    assignmentId: objectIdSchema.optional(),
    courseId: objectIdSchema.optional(),
    batchId: objectIdSchema.optional(),
  })
  .strict()
export type ExportSubmissionsQuery = z.infer<typeof exportSubmissionsQuerySchema>

export const returnSubmissionSchema = z
  .object({
    reason: z.string().trim().min(1, 'A reason is required to return a submission').max(500),
  })
  .strict()
export type ReturnSubmissionInput = z.infer<typeof returnSubmissionSchema>
