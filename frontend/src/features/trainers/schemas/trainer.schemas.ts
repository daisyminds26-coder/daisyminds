import { z } from 'zod'

import {
  AVAILABILITY_SLOT_TYPES,
  AVAILABILITY_STATUSES,
  DAYS_OF_WEEK,
  EMPLOYMENT_STATUSES,
  EMPLOYMENT_TYPES,
  GENDERS,
  GRADE_TYPES,
  PREFERRED_TIME_SLOTS,
  TEACHING_LEVELS,
  TEACHING_MODES,
  TRAINER_SOURCES,
} from '@/features/trainers/types'

/** Mirrors `backend/src/validators/trainer.validator.ts`'s password rule exactly. */
const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(200, 'Password must be at most 200 characters')
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

const phoneSchema = z
  .string()
  .trim()
  .min(6, 'Enter a valid phone number')
  .max(20, 'Enter a valid phone number')

const urlSchema = z
  .url('Enter a valid URL')
  .refine((value) => value.startsWith('https://') || value.startsWith('http://'), {
    message: 'URL must start with http:// or https://',
  })

/**
 * A trainer's address as a whole is optional, but `address.*` inputs mounting on the Contact
 * step turn `address` from `undefined` into a real (possibly all-empty) object once RHF
 * registers them — `addressSchema.optional()` alone isn't enough, since an untouched,
 * all-empty address would then fail every required sub-field's validation with no visible
 * error (those fields aren't rendered on Review). See
 * `features/students/schemas/student.schemas.ts` for the same landmine, hit once already.
 *
 * Every field is optional-or-empty here, with a refine requiring all-or-nothing: either every
 * field is blank (matches the backend's `address` being entirely absent) or every required
 * field is filled (matches the backend's per-field `min(1)` when `address` is sent at all) —
 * `toPayload()` converts an all-blank result to `undefined` before the request goes out.
 */
const addressSchema = z
  .object({
    line1: z.string().trim().max(200).optional().or(z.literal('')),
    line2: z.string().trim().max(200).optional().or(z.literal('')),
    city: z.string().trim().max(100).optional().or(z.literal('')),
    state: z.string().trim().max(100).optional().or(z.literal('')),
    postalCode: z.string().trim().max(20).optional().or(z.literal('')),
    country: z.string().trim().max(100).optional().or(z.literal('')),
  })
  .refine(
    (value) => {
      const fields = [value.line1, value.city, value.state, value.postalCode, value.country]
      const hasAny = fields.some((field) => Boolean(field))
      const hasAll = fields.every((field) => Boolean(field))
      return !hasAny || hasAll
    },
    {
      message: 'Fill in all required address fields, or leave the whole address blank',
      path: ['line1'],
    },
  )

/** `yearOfCompletion` stays a validated string throughout the form's lifetime — see `features/students/schemas/student.schemas.ts` for why (avoids the `z.coerce` / `Control<T>` inference break). */
const qualificationSchema = z.object({
  degree: z.string().trim().min(1, 'Qualification is required').max(150),
  institution: z.string().trim().min(1, 'Institution is required').max(200),
  boardOrUniversity: z.string().trim().max(200).optional().or(z.literal('')),
  fieldOfStudy: z.string().trim().max(150).optional().or(z.literal('')),
  yearOfCompletion: z
    .string()
    .trim()
    .regex(/^\d{4}$/, 'Enter a 4-digit year'),
  gradeValue: z.string().trim().max(20).optional().or(z.literal('')),
  gradeType: z.enum(GRADE_TYPES).optional(),
})

const certificationSchema = z
  .object({
    name: z.string().trim().min(1, 'Certification name is required').max(200),
    issuingOrganization: z.string().trim().min(1, 'Issuing organization is required').max(200),
    credentialId: z.string().trim().max(100).optional().or(z.literal('')),
    issueDate: z.date(),
    expiryDate: z.date().optional(),
    verificationUrl: urlSchema.optional().or(z.literal('')),
  })
  .refine((value) => !value.expiryDate || value.expiryDate > value.issueDate, {
    message: 'Expiry date must be after the issue date',
    path: ['expiryDate'],
  })

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

/** Mirrors the backend's alias-tolerant timezone check exactly (`Intl.DateTimeFormat` construction, not `Intl.supportedValuesOf`) — see `trainer.validator.ts` for why. */
function isValidTimeZone(value: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value })
    return true
  } catch {
    return false
  }
}

const availabilitySlotSchema = z
  .object({
    dayOfWeek: z.enum(DAYS_OF_WEEK),
    startTime: z.string().regex(TIME_PATTERN, 'Use 24-hour HH:mm format'),
    endTime: z.string().regex(TIME_PATTERN, 'Use 24-hour HH:mm format'),
    timeZone: z.string().refine(isValidTimeZone, { message: 'Unrecognized time zone' }),
    type: z.enum(AVAILABILITY_SLOT_TYPES),
  })
  .refine((value) => value.startTime < value.endTime, {
    message: 'Start time must be before end time',
    path: ['endTime'],
  })

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

export const trainerProfileSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  dateOfBirth: z
    .date()
    .refine((date) => date < new Date(), { message: 'Date of birth must be in the past' })
    .optional(),
  gender: z.enum(GENDERS).optional(),
  preferredLanguage: z.string().trim().max(60).optional().or(z.literal('')),
  bio: z.string().trim().max(2000).optional().or(z.literal('')),
  phone: phoneSchema,
  alternatePhone: phoneSchema.optional().or(z.literal('')),
  address: addressSchema.optional(),

  designation: z.string().trim().max(150).optional().or(z.literal('')),
  department: z.string().trim().max(150).optional().or(z.literal('')),
  totalYearsExperience: z
    .string()
    .trim()
    .regex(/^\d*$/, 'Numbers only')
    .optional()
    .or(z.literal('')),
  teachingYearsExperience: z
    .string()
    .trim()
    .regex(/^\d*$/, 'Numbers only')
    .optional()
    .or(z.literal('')),
  industryYearsExperience: z
    .string()
    .trim()
    .regex(/^\d*$/, 'Numbers only')
    .optional()
    .or(z.literal('')),
  expertiseAreas: z.array(z.string().trim().min(1).max(60)).max(30),
  secondaryExpertise: z.array(z.string().trim().min(1).max(60)).max(30),
  specializations: z.array(z.string().trim().min(1).max(60)).max(30),
  linkedinUrl: urlSchema.optional().or(z.literal('')),
  portfolioUrl: urlSchema.optional().or(z.literal('')),
  githubUrl: urlSchema.optional().or(z.literal('')),
  websiteUrl: urlSchema.optional().or(z.literal('')),

  qualifications: z.array(qualificationSchema).max(20),
  certifications: z.array(certificationSchema).max(20),

  joiningDate: z.date().optional(),
  employmentType: z.enum(EMPLOYMENT_TYPES).optional(),
  employmentStatus: z.enum(EMPLOYMENT_STATUSES),
  employeeCode: z.string().trim().max(60).optional().or(z.literal('')),
  workLocation: z.string().trim().max(200).optional().or(z.literal('')),
  probationEndDate: z.date().optional(),

  preferredTeachingModes: z.array(z.enum(TEACHING_MODES)).max(3),
  preferredTimeSlots: z.array(z.enum(PREFERRED_TIME_SLOTS)).max(4),
  maxConcurrentBatches: z
    .string()
    .trim()
    .regex(/^\d*$/, 'Numbers only')
    .optional()
    .or(z.literal('')),
  maxWeeklyTeachingHours: z
    .string()
    .trim()
    .regex(/^\d*$/, 'Numbers only')
    .optional()
    .or(z.literal('')),
  availabilityStatus: z.enum(AVAILABILITY_STATUSES),
  availabilityNotes: z.string().trim().max(1000).optional().or(z.literal('')),
  languagesOfInstruction: z.array(z.string().trim().min(1).max(60)).max(20),
  teachingLevel: z.enum(TEACHING_LEVELS).optional(),
  qualifiedToTeachSubjects: z.array(z.string().trim().min(1).max(100)).max(50),
  availability: z.array(availabilitySlotSchema).max(50).superRefine(rejectOverlappingAvailability),

  source: z.enum(TRAINER_SOURCES).optional(),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
})

export const createTrainerSchema = trainerProfileSchema.extend({
  email: z.email('Enter a valid email address'),
  password: passwordSchema,
  sendInvitation: z.boolean(),
})
export type CreateTrainerFormValues = z.infer<typeof createTrainerSchema>

export const updateTrainerSchema = trainerProfileSchema
export type UpdateTrainerFormValues = z.infer<typeof updateTrainerSchema>
