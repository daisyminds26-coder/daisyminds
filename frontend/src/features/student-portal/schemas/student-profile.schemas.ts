import { z } from 'zod'

/** Mirrors `backend/src/validators/student-portal.validator.ts#updateOwnProfileSchema` exactly — the same narrow, self-service-safe field set. */
const phoneSchema = z
  .string()
  .trim()
  .min(6, 'Enter a valid phone number')
  .max(20, 'Enter a valid phone number')

export const studentProfileFormSchema = z.object({
  phone: phoneSchema,
  alternatePhone: phoneSchema.optional().or(z.literal('')),
  address: z.object({
    line1: z.string().trim().min(1, 'Address line 1 is required').max(200),
    line2: z.string().trim().max(200).optional().or(z.literal('')),
    city: z.string().trim().min(1, 'City is required').max(100),
    state: z.string().trim().min(1, 'State is required').max(100),
    postalCode: z.string().trim().min(1, 'Postal code is required').max(20),
    country: z.string().trim().min(1, 'Country is required').max(100),
  }),
  emergencyContact: z.object({
    name: z.string().trim().min(1, 'Name is required').max(150),
    phone: phoneSchema,
    relationship: z.string().trim().min(1, 'Relationship is required').max(60),
  }),
})

export type StudentProfileFormValues = z.infer<typeof studentProfileFormSchema>
