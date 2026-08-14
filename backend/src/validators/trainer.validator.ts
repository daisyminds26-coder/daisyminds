import { z } from 'zod'

import { USER_STATUSES } from '../models/user.model'
import {
  AVAILABILITY_SLOT_TYPES,
  AVAILABILITY_STATUSES,
  DAYS_OF_WEEK,
  EMPLOYMENT_STATUSES,
  EMPLOYMENT_TYPES,
  GENDERS,
  GRADE_TYPES,
  PREFERRED_TIME_SLOTS,
  PROFILE_COMPLETION_STATUSES,
  TEACHING_LEVELS,
  TEACHING_MODES,
  TRAINER_SOURCES,
} from '../models/trainer.model'
import { isValidTimeZone } from '../utils/timezone'

/** Mirrors `student.validator.ts`'s password rule exactly (same as `user.validator.ts`'s). */
const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(200)
  .regex(/[a-zA-Z]/, 'Password must include at least one letter')
  .regex(/[0-9]/, 'Password must include at least one number')

const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id')
const phoneSchema = z
  .string()
  .trim()
  .min(6, 'Enter a valid phone number')
  .max(20)
  .regex(/^[0-9+\-() ]+$/, 'Phone number contains invalid characters')

const urlSchema = z
  .url('Enter a valid URL')
  .refine((value) => value.startsWith('https://') || value.startsWith('http://'), {
    message: 'URL must start with http:// or https://',
  })
  .refine((value) => value.length <= 500, { message: 'URL is too long' })

/** An empty string means "not provided" for an optional field — a blank text input clears to `''`, not `undefined`, so `.optional()` alone still rejects it. Every optional phone/URL field below uses one of these instead of `<schema>.optional()` directly. */
const optionalPhoneSchema = z.preprocess(
  (value) => (value === '' ? undefined : value),
  phoneSchema.optional(),
)
const optionalUrlSchema = z.preprocess(
  (value) => (value === '' ? undefined : value),
  urlSchema.optional(),
)

export const trainerIdParamSchema = z.object({ id: objectIdSchema }).strict()
export type TrainerIdParam = z.infer<typeof trainerIdParamSchema>

export const trainerSessionParamSchema = z
  .object({ id: objectIdSchema, sessionId: objectIdSchema })
  .strict()
export type TrainerSessionParam = z.infer<typeof trainerSessionParamSchema>

const addressSchema = z
  .object({
    line1: z.string().trim().min(1).max(200),
    line2: z.string().trim().max(200).optional(),
    city: z.string().trim().min(1).max(100),
    state: z.string().trim().min(1).max(100),
    postalCode: z.string().trim().min(1).max(20),
    country: z.string().trim().min(1).max(100),
  })
  .strict()

const emergencyContactSchema = z
  .object({
    name: z.string().trim().min(1).max(150),
    phone: phoneSchema,
    relationship: z.string().trim().min(1).max(60),
    alternatePhone: optionalPhoneSchema,
    email: z.email().optional(),
  })
  .strict()

const currentYear = new Date().getFullYear()

const qualificationSchema = z
  .object({
    degree: z.string().trim().min(1).max(150),
    institution: z.string().trim().min(1).max(200),
    boardOrUniversity: z.string().trim().max(200).optional(),
    fieldOfStudy: z.string().trim().max(150).optional(),
    yearOfCompletion: z.coerce
      .number()
      .int()
      .min(1950)
      .max(currentYear + 1),
    gradeValue: z.string().trim().max(20).optional(),
    gradeType: z.enum(GRADE_TYPES).optional(),
    documentUrl: z.string().optional(),
    documentPublicId: z.string().optional(),
  })
  .strict()

const certificationSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    issuingOrganization: z.string().trim().min(1).max(200),
    credentialId: z.string().trim().max(100).optional(),
    issueDate: z.coerce.date(),
    expiryDate: z.coerce.date().optional(),
    verificationUrl: optionalUrlSchema,
    documentUrl: z.string().optional(),
    documentPublicId: z.string().optional(),
  })
  .strict()
  .refine((value) => !value.expiryDate || value.expiryDate > value.issueDate, {
    message: 'Expiry date must be after the issue date',
    path: ['expiryDate'],
  })

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

const availabilitySlotSchema = z
  .object({
    dayOfWeek: z.enum(DAYS_OF_WEEK),
    startTime: z.string().regex(TIME_PATTERN, 'Use 24-hour HH:mm format'),
    endTime: z.string().regex(TIME_PATTERN, 'Use 24-hour HH:mm format'),
    timeZone: z.string().refine(isValidTimeZone, {
      message: 'Unrecognized IANA time zone',
    }),
    type: z.enum(AVAILABILITY_SLOT_TYPES).default('AVAILABLE'),
    effectiveFrom: z.coerce.date().optional(),
    effectiveTo: z.coerce.date().optional(),
  })
  .strict()
  .refine((value) => value.startTime < value.endTime, {
    message: 'Start time must be before end time',
    path: ['endTime'],
  })
  .refine(
    (value) =>
      !value.effectiveFrom || !value.effectiveTo || value.effectiveTo > value.effectiveFrom,
    {
      message: 'Effective-to date must be after the effective-from date',
      path: ['effectiveTo'],
    },
  )

/**
 * Rejects two slots of the *same* `type` on the same `dayOfWeek` whose
 * [start, end) ranges overlap — a `BLOCKED` slot is allowed to overlap an
 * `AVAILABLE`/`PREFERRED` one (it represents an exception carved out of an
 * otherwise-open window), but two `AVAILABLE` (or two `PREFERRED`, or two
 * `BLOCKED`) slots overlapping each other is always a data-entry error.
 * O(n²) over the slot list, which is fine — a real trainer's weekly
 * schedule is a handful of entries, never hundreds.
 */
function rejectOverlappingAvailability(
  slots: { dayOfWeek: string; startTime: string; endTime: string; type: string }[],
  ctx: z.RefinementCtx,
): void {
  for (let i = 0; i < slots.length; i += 1) {
    for (let j = i + 1; j < slots.length; j += 1) {
      const a = slots[i]
      const b = slots[j]
      if (!a || !b) continue
      if (a.dayOfWeek !== b.dayOfWeek || a.type !== b.type) continue
      const overlaps = a.startTime < b.endTime && b.startTime < a.endTime
      if (overlaps) {
        ctx.addIssue({
          code: 'custom',
          message: `Overlapping ${a.type} slots on ${a.dayOfWeek}`,
          path: [j, 'startTime'],
        })
      }
    }
  }
}

const availabilityArraySchema = z
  .array(availabilitySlotSchema)
  .max(50)
  .superRefine(rejectOverlappingAvailability)

const tagSchema = z.string().trim().min(1).max(40)

/**
 * Shared by create/update. `email`/`password`/`role`/`trainerId`/audit
 * fields are deliberately absent — mass assignment of auth-identity or
 * system-generated fields is never accepted here (SECURITY.md).
 *
 * Deliberately **no** `.default()` on any array/enum-with-default field
 * here — this object also feeds `updateTrainerSchema` via `.partial()`.
 * Same empirically-verified rule `question.validator.ts`/`batch.validator.ts`
 * document (SECURITY.md §4): a defaulted field here would silently reset it
 * on any update that didn't resend it (e.g. wiping `expertiseAreas` on an
 * unrelated phone-number edit). Defaults are applied only on
 * `createTrainerSchema` below, via `.extend()`.
 */
const trainerProfileSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100),
    middleName: z.string().trim().max(100).optional(),
    lastName: z.string().trim().min(1).max(100),
    displayName: z.string().trim().max(250).optional(),
    dateOfBirth: z.coerce
      .date()
      .refine((date) => date < new Date(), { message: 'Date of birth must be in the past' })
      .optional(),
    gender: z.enum(GENDERS).optional(),
    preferredLanguage: z.string().trim().max(60).optional(),
    bio: z.string().trim().max(2000).optional(),
    phone: phoneSchema,
    alternatePhone: optionalPhoneSchema,
    address: addressSchema.optional(),
    emergencyContacts: z.array(emergencyContactSchema).max(5).optional(),

    designation: z.string().trim().max(150).optional(),
    department: z.string().trim().max(150).optional(),
    totalYearsExperience: z.coerce.number().min(0).max(80).optional(),
    teachingYearsExperience: z.coerce.number().min(0).max(80).optional(),
    industryYearsExperience: z.coerce.number().min(0).max(80).optional(),
    expertiseAreas: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
    secondaryExpertise: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
    skills: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
    technologies: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
    specializations: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
    linkedinUrl: optionalUrlSchema,
    portfolioUrl: optionalUrlSchema,
    githubUrl: optionalUrlSchema,
    websiteUrl: optionalUrlSchema,

    qualifications: z.array(qualificationSchema).max(20).optional(),
    certifications: z.array(certificationSchema).max(20).optional(),

    joiningDate: z.coerce.date().optional(),
    employmentType: z.enum(EMPLOYMENT_TYPES).optional(),
    employmentStatus: z.enum(EMPLOYMENT_STATUSES).optional(),
    employeeCode: z.string().trim().max(60).optional(),
    reportingManagerId: objectIdSchema.optional(),
    workLocation: z.string().trim().max(200).optional(),
    probationEndDate: z.coerce.date().optional(),
    noticePeriodDays: z.coerce.number().int().min(0).max(365).optional(),

    preferredTeachingModes: z.array(z.enum(TEACHING_MODES)).max(3).optional(),
    preferredTimeSlots: z.array(z.enum(PREFERRED_TIME_SLOTS)).max(4).optional(),
    maxConcurrentBatches: z.coerce.number().int().min(0).max(50).optional(),
    maxWeeklyTeachingHours: z.coerce.number().min(0).max(168).optional(),
    availabilityStatus: z.enum(AVAILABILITY_STATUSES).optional(),
    availabilityNotes: z.string().trim().max(1000).optional(),
    languagesOfInstruction: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
    teachingLevel: z.enum(TEACHING_LEVELS).optional(),
    qualifiedToTeachSubjects: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
    availability: availabilityArraySchema.optional(),

    source: z.enum(TRAINER_SOURCES).optional(),
    notes: z.string().trim().max(2000).optional(),
    tags: z.array(tagSchema).max(20).optional(),
  })
  .strict()

export const createTrainerSchema = trainerProfileSchema
  .extend({
    email: z.email(),
    password: passwordSchema,
    emergencyContacts: z.array(emergencyContactSchema).max(5).default([]),
    expertiseAreas: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
    secondaryExpertise: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
    skills: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
    technologies: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
    specializations: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
    qualifications: z.array(qualificationSchema).max(20).default([]),
    certifications: z.array(certificationSchema).max(20).default([]),
    employmentStatus: z.enum(EMPLOYMENT_STATUSES).default('ACTIVE'),
    preferredTeachingModes: z.array(z.enum(TEACHING_MODES)).max(3).default([]),
    preferredTimeSlots: z.array(z.enum(PREFERRED_TIME_SLOTS)).max(4).default([]),
    availabilityStatus: z.enum(AVAILABILITY_STATUSES).default('AVAILABLE'),
    languagesOfInstruction: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
    qualifiedToTeachSubjects: z.array(z.string().trim().min(1).max(100)).max(50).default([]),
    availability: availabilityArraySchema.default([]),
    tags: z.array(tagSchema).max(20).default([]),
    /** Mirrors `students`' `sendInvitation` semantics exactly — same underlying flow. */
    sendInvitation: z.boolean().default(true),
  })
  .strict()
export type CreateTrainerInput = z.infer<typeof createTrainerSchema>

/** Every field optional (true partial update) — still `.strict()`, so an update body can omit any field but never one this schema doesn't know about. */
export const updateTrainerSchema = trainerProfileSchema.partial().strict()
export type UpdateTrainerInput = z.infer<typeof updateTrainerSchema>

type SortableField =
  | 'trainerId'
  | 'firstName'
  | 'lastName'
  | 'joiningDate'
  | 'totalYearsExperience'
  | 'createdAt'
  | 'updatedAt'
  | 'status'
  | 'employmentStatus'
  | 'profileCompletionPercentage'

export const listTrainersQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sort: z
      .string()
      .regex(
        /^(trainerId|firstName|lastName|joiningDate|totalYearsExperience|createdAt|updatedAt|status|employmentStatus|profileCompletionPercentage):(asc|desc)$/,
      )
      .default('createdAt:desc')
      .transform((value) => {
        const [field, direction] = value.split(':') as [SortableField, 'asc' | 'desc']
        return { field, direction }
      }),
    status: z.enum(USER_STATUSES).optional(),
    employmentStatus: z.enum(EMPLOYMENT_STATUSES).optional(),
    employmentType: z.enum(EMPLOYMENT_TYPES).optional(),
    department: z.string().trim().min(1).max(150).optional(),
    designation: z.string().trim().min(1).max(150).optional(),
    expertise: z.string().trim().min(1).max(60).optional(),
    technology: z.string().trim().min(1).max(60).optional(),
    availabilityStatus: z.enum(AVAILABILITY_STATUSES).optional(),
    profileCompletionStatus: z.enum(PROFILE_COMPLETION_STATUSES).optional(),
    city: z.string().trim().min(1).max(100).optional(),
    state: z.string().trim().min(1).max(100).optional(),
    tag: z.string().trim().min(1).max(40).optional(),
    joiningDateFrom: z.coerce.date().optional(),
    joiningDateTo: z.coerce.date().optional(),
    minExperience: z.coerce.number().min(0).max(80).optional(),
    maxExperience: z.coerce.number().min(0).max(80).optional(),
    search: z.string().trim().min(1).max(254).optional(),
    includeDeleted: z.coerce.boolean().default(false),
  })
  .strict()
export type ListTrainersQuery = z.infer<typeof listTrainersQuerySchema>

export const exportTrainersQuerySchema = listTrainersQuerySchema.omit({ page: true, limit: true })
export type ExportTrainersQuery = z.infer<typeof exportTrainersQuerySchema>

export const paginationQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict()
export type PaginationQuery = z.infer<typeof paginationQuerySchema>

export const TRAINER_BULK_ACTIONS = ['activate', 'deactivate', 'delete', 'restore'] as const
export type TrainerBulkAction = (typeof TRAINER_BULK_ACTIONS)[number]

export const trainerBulkActionSchema = z
  .object({
    action: z.enum(TRAINER_BULK_ACTIONS),
    trainerIds: z.array(objectIdSchema).min(1).max(100),
  })
  .strict()
export type TrainerBulkActionInput = z.infer<typeof trainerBulkActionSchema>

export const confirmPhotoSchema = z
  .object({
    publicId: z.string().trim().min(1).max(300),
  })
  .strict()
export type ConfirmPhotoInput = z.infer<typeof confirmPhotoSchema>
