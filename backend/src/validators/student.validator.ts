import { z } from 'zod'

import { USER_STATUSES } from '../models/user.model'
import {
  GENDERS,
  GRADE_TYPES,
  PROFILE_COMPLETION_STATUSES,
  STUDENT_SOURCES,
} from '../models/student.model'

/** Mirrors `user.validator.ts`'s password rule exactly — an admin-set temporary password for the linked account. */
const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(200)
  .regex(/[a-zA-Z]/, 'Password must include at least one letter')
  .regex(/[0-9]/, 'Password must include at least one number')

const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id')
/** Exported for reuse by the student self-service profile validator (Phase 11A) — same rule, not a parallel copy. */
export const phoneSchema = z
  .string()
  .trim()
  .min(6, 'Enter a valid phone number')
  .max(20)
  .regex(/^[0-9+\-() ]+$/, 'Phone number contains invalid characters')

export const studentIdParamSchema = z.object({ id: objectIdSchema }).strict()
export type StudentIdParam = z.infer<typeof studentIdParamSchema>

export const studentSessionParamSchema = z
  .object({ id: objectIdSchema, sessionId: objectIdSchema })
  .strict()
export type StudentSessionParam = z.infer<typeof studentSessionParamSchema>

/** Exported for reuse by the student self-service profile validator (Phase 11A) — same rule, not a parallel copy. */
export const addressSchema = z
  .object({
    line1: z.string().trim().min(1).max(200),
    line2: z.string().trim().max(200).optional(),
    city: z.string().trim().min(1).max(100),
    state: z.string().trim().min(1).max(100),
    postalCode: z.string().trim().min(1).max(20),
    country: z.string().trim().min(1).max(100),
  })
  .strict()

/** Exported for reuse by the student self-service profile validator (Phase 11A) — same rule, not a parallel copy. */
export const emergencyContactSchema = z
  .object({
    name: z.string().trim().min(1).max(150),
    phone: phoneSchema,
    relationship: z.string().trim().min(1).max(60),
    alternatePhone: phoneSchema.optional(),
    email: z.email().optional(),
  })
  .strict()

const educationRecordSchema = z
  .object({
    degree: z.string().trim().min(1).max(150),
    institution: z.string().trim().min(1).max(200),
    yearOfCompletion: z.coerce
      .number()
      .int()
      .min(1950)
      .max(new Date().getFullYear() + 1),
    boardOrUniversity: z.string().trim().max(200).optional(),
    fieldOfStudy: z.string().trim().max(150).optional(),
    gradeValue: z.string().trim().max(20).optional(),
    gradeType: z.enum(GRADE_TYPES).optional(),
    /** Set only via the confirm-upload endpoint, never accepted as raw client input on the record itself — see student.routes.ts. */
    documentUrl: z.string().optional(),
    documentPublicId: z.string().optional(),
  })
  .strict()

const isoDateSchema = z.coerce.date()

const dateOfBirthSchema = isoDateSchema.refine((date) => date < new Date(), {
  message: 'Date of birth must be in the past',
})

const MAX_FUTURE_ADMISSION_DAYS = 365
const admissionDateSchema = isoDateSchema.refine(
  (date) => date.getTime() <= Date.now() + MAX_FUTURE_ADMISSION_DAYS * 86_400_000,
  { message: 'Admission date is too far in the future' },
)

const tagSchema = z.string().trim().min(1).max(40)

/**
 * Shared by create/update. `email`/`password`/`role`/`studentId`/audit
 * fields are deliberately absent — mass assignment of auth-identity or
 * system-generated fields is never accepted here (SECURITY.md).
 */
const studentProfileSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100),
    middleName: z.string().trim().max(100).optional(),
    lastName: z.string().trim().min(1).max(100),
    displayName: z.string().trim().max(250).optional(),
    dateOfBirth: dateOfBirthSchema,
    gender: z.enum(GENDERS).optional(),
    preferredLanguage: z.string().trim().max(60).optional(),
    phone: phoneSchema,
    alternatePhone: phoneSchema.optional(),
    address: addressSchema,
    emergencyContacts: z
      .array(emergencyContactSchema)
      .min(1, 'At least one emergency contact is required')
      .max(5),
    guardianName: z.string().trim().max(200).optional(),
    guardianPhone: phoneSchema.optional(),
    guardianEmail: z.email().optional(),
    guardianRelationship: z.string().trim().max(60).optional(),
    guardianOccupation: z.string().trim().max(150).optional(),
    guardianAddressSameAsStudent: z.boolean().default(false),
    guardianAddress: addressSchema.optional(),
    educationRecords: z.array(educationRecordSchema).max(20).default([]),
    admissionDate: admissionDateSchema.optional(),
    source: z.enum(STUDENT_SOURCES).optional(),
    counsellorId: objectIdSchema.optional(),
    notes: z.string().trim().max(2000).optional(),
    tags: z.array(tagSchema).max(20).default([]),
  })
  .strict()

export const createStudentSchema = studentProfileSchema
  .extend({
    email: z.email(),
    password: passwordSchema,
    /** Mirrors `users`' `sendVerificationEmail` semantics exactly — same underlying flow, different field name for this module's own copy/UI. */
    sendInvitation: z.boolean().default(true),
  })
  .strict()
export type CreateStudentInput = z.infer<typeof createStudentSchema>

/**
 * Every field optional (a true partial update) — but still `.strict()`, so
 * an update body can *omit* any field (left unchanged) while never
 * accepting a field this schema doesn't know about at all.
 */
export const updateStudentSchema = studentProfileSchema.partial().strict()
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>

type SortableField =
  'studentId' | 'firstName' | 'lastName' | 'admissionDate' | 'createdAt' | 'updatedAt' | 'status'

export const listStudentsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sort: z
      .string()
      .regex(/^(studentId|firstName|lastName|admissionDate|createdAt|updatedAt|status):(asc|desc)$/)
      .default('createdAt:desc')
      .transform((value) => {
        const [field, direction] = value.split(':') as [SortableField, 'asc' | 'desc']
        return { field, direction }
      }),
    status: z.enum(USER_STATUSES).optional(),
    gender: z.enum(GENDERS).optional(),
    state: z.string().trim().min(1).max(100).optional(),
    city: z.string().trim().min(1).max(100).optional(),
    source: z.enum(STUDENT_SOURCES).optional(),
    tag: z.string().trim().min(1).max(40).optional(),
    profileCompletionStatus: z.enum(PROFILE_COMPLETION_STATUSES).optional(),
    admissionDateFrom: z.coerce.date().optional(),
    admissionDateTo: z.coerce.date().optional(),
    search: z.string().trim().min(1).max(254).optional(),
    includeDeleted: z.coerce.boolean().default(false),
  })
  .strict()
export type ListStudentsQuery = z.infer<typeof listStudentsQuerySchema>

export const exportStudentsQuerySchema = listStudentsQuerySchema.omit({ page: true, limit: true })
export type ExportStudentsQuery = z.infer<typeof exportStudentsQuerySchema>

export const paginationQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict()
export type PaginationQuery = z.infer<typeof paginationQuerySchema>

export const STUDENT_BULK_ACTIONS = ['activate', 'deactivate', 'delete', 'restore'] as const
export type StudentBulkAction = (typeof STUDENT_BULK_ACTIONS)[number]

export const studentBulkActionSchema = z
  .object({
    action: z.enum(STUDENT_BULK_ACTIONS),
    studentIds: z.array(objectIdSchema).min(1).max(100),
  })
  .strict()
export type StudentBulkActionInput = z.infer<typeof studentBulkActionSchema>

export const confirmPhotoSchema = z
  .object({
    publicId: z.string().trim().min(1).max(300),
  })
  .strict()
export type ConfirmPhotoInput = z.infer<typeof confirmPhotoSchema>
