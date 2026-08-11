import { z } from 'zod'

/** Mirrors `backend/src/validators/user.validator.ts`'s password rule exactly (same as auth's). */
const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(200, 'Password must be at most 200 characters')
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

export const createUserSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: passwordSchema,
  roleId: z.string().min(1, 'Select a role'),
  sendVerificationEmail: z.boolean(),
})
export type CreateUserFormValues = z.infer<typeof createUserSchema>

export const updateUserSchema = z.object({
  email: z.email('Enter a valid email address'),
})
export type UpdateUserFormValues = z.infer<typeof updateUserSchema>

export const assignRoleSchema = z.object({
  roleId: z.string().min(1, 'Select a role'),
})
export type AssignRoleFormValues = z.infer<typeof assignRoleSchema>
