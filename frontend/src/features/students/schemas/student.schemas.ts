import { z } from 'zod'

import { GENDERS, GRADE_TYPES, STUDENT_SOURCES } from '@/features/students/types'

/** Mirrors `backend/src/validators/student.validator.ts`'s password rule exactly. */
const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(200, 'Password must be at most 200 characters')
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

/** Mirrors `backend/src/validators/student.validator.ts`'s `phoneSchema` exactly. */
const phoneSchema = z
  .string()
  .trim()
  .min(6, 'Enter a valid phone number')
  .max(20, 'Enter a valid phone number')
  .regex(/^[0-9+\-() ]+$/, 'Phone number contains invalid characters')

const addressSchema = z.object({
  line1: z.string().trim().min(1, 'Address line 1 is required').max(200),
  line2: z.string().trim().max(200).optional().or(z.literal('')),
  city: z.string().trim().min(1, 'City is required').max(100),
  state: z.string().trim().min(1, 'State is required').max(100),
  postalCode: z.string().trim().min(1, 'Postal code is required').max(20),
  country: z.string().trim().min(1, 'Country is required').max(100),
})

const emergencyContactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(150),
  phone: phoneSchema,
  relationship: z.string().trim().min(1, 'Relationship is required').max(60),
  alternatePhone: phoneSchema.optional().or(z.literal('')),
  email: z.email('Enter a valid email').optional().or(z.literal('')),
})

/**
 * `yearOfCompletion` is deliberately kept a plain (regex-validated) string
 * throughout the form's lifetime, converted to a number only in the
 * `toPayload()` step right before the API call — `z.coerce.number()` here
 * would make Zod's inferred *input* type (what the `<input type="number">`
 * actually puts into RHF state, a string) diverge from its *output* type
 * (number), which breaks `useForm<T>()`'s single-generic-parameter
 * `Control<T>` inference that every shared `*Field` component in this app
 * is typed against. Same reasoning applies to `dateOfBirth`/`admissionDate`
 * below — those use plain `z.date()`, not `z.coerce.date()`, since
 * `DatePickerField` already produces real `Date` objects, never a string.
 */
const educationRecordSchema = z.object({
  degree: z.string().trim().min(1, 'Qualification is required').max(150),
  institution: z.string().trim().min(1, 'Institution is required').max(200),
  yearOfCompletion: z
    .string()
    .trim()
    .regex(/^\d{4}$/, 'Enter a 4-digit year'),
  boardOrUniversity: z.string().trim().max(200).optional().or(z.literal('')),
  fieldOfStudy: z.string().trim().max(150).optional().or(z.literal('')),
  gradeValue: z.string().trim().max(20).optional().or(z.literal('')),
  gradeType: z.enum(GRADE_TYPES).optional(),
})

const dateOfBirthSchema = z.date().refine((date) => date < new Date(), {
  message: 'Date of birth must be in the past',
})

export const studentProfileSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  dateOfBirth: dateOfBirthSchema,
  gender: z.enum(GENDERS).optional(),
  preferredLanguage: z.string().trim().max(60).optional().or(z.literal('')),
  phone: phoneSchema,
  address: addressSchema,
  emergencyContacts: z
    .array(emergencyContactSchema)
    .min(1, 'At least one emergency contact is required')
    .max(5),
  educationRecords: z.array(educationRecordSchema).max(20),
  admissionDate: z.date().optional(),
  source: z.enum(STUDENT_SOURCES).optional(),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
})

export const createStudentSchema = studentProfileSchema.extend({
  email: z.email('Enter a valid email address'),
  password: passwordSchema,
  sendInvitation: z.boolean(),
})
export type CreateStudentFormValues = z.infer<typeof createStudentSchema>

export const updateStudentSchema = studentProfileSchema
export type UpdateStudentFormValues = z.infer<typeof updateStudentSchema>
