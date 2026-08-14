import { z } from 'zod'

const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id')

export const trainerAssignmentStudentParamSchema = z
  .object({ id: objectIdSchema, studentId: objectIdSchema })
  .strict()
export type TrainerAssignmentStudentParam = z.infer<typeof trainerAssignmentStudentParamSchema>
