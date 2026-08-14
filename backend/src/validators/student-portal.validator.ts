import { z } from 'zod'

import { addressSchema, emergencyContactSchema, phoneSchema } from './student.validator'

const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id')

export const enrollmentIdParamSchema = z.object({ id: objectIdSchema }).strict()
export type EnrollmentIdParam = z.infer<typeof enrollmentIdParamSchema>

export const courseIdParamSchema = z.object({ courseId: objectIdSchema }).strict()
export type StudentCourseIdParam = z.infer<typeof courseIdParamSchema>

export const resourceIdParamSchema = z.object({ resourceId: objectIdSchema }).strict()
export type ResourceIdParam = z.infer<typeof resourceIdParamSchema>

/**
 * A deliberately narrow subset of `studentProfileSchema` (student.validator.ts)
 * — only the fields the task spec names as safe for self-service edit.
 * `studentId`/`enrollment`/`role`/`status`/`admissionDate`/`internalNotes`
 * and every other identity/system field are absent on purpose, not omitted
 * by oversight; a student can never mass-assign them because they're not in
 * this schema at all (`.strict()` rejects anything else outright).
 */
export const updateOwnProfileSchema = z
  .object({
    phone: phoneSchema.optional(),
    alternatePhone: phoneSchema.optional(),
    address: addressSchema.optional(),
    emergencyContacts: z.array(emergencyContactSchema).min(1).max(5).optional(),
  })
  .strict()
export type UpdateOwnProfileInput = z.infer<typeof updateOwnProfileSchema>
