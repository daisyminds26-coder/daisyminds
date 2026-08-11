import { z } from 'zod'

import { USER_STATUSES } from '../models/user.model'

/** SECURITY.md §2 — mirrors auth.validator.ts's passwordSchema exactly. */
const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(200)
  .regex(/[a-zA-Z]/, 'Password must include at least one letter')
  .regex(/[0-9]/, 'Password must include at least one number')

const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id')

export const userIdParamSchema = z.object({ id: objectIdSchema }).strict()
export type UserIdParam = z.infer<typeof userIdParamSchema>

export const userSessionParamSchema = z
  .object({ id: objectIdSchema, sessionId: objectIdSchema })
  .strict()
export type UserSessionParam = z.infer<typeof userSessionParamSchema>

export const createUserSchema = z
  .object({
    email: z.email(),
    password: passwordSchema,
    roleId: objectIdSchema,
    /** Defaults to true — most admin-created accounts should verify their own email before first login. */
    sendVerificationEmail: z.boolean().default(true),
  })
  .strict()
export type CreateUserInput = z.infer<typeof createUserSchema>

/**
 * Deliberately narrow: `users` is an auth-identity record only (no name,
 * phone, avatar — DATABASE.md §3.1), so there is nothing else on this
 * schema for an admin to edit. Profile fields belong to the future
 * students/trainers modules, not this one.
 */
export const updateUserSchema = z.object({ email: z.email() }).strict()
export type UpdateUserInput = z.infer<typeof updateUserSchema>

export const assignRoleSchema = z.object({ roleId: objectIdSchema }).strict()
export type AssignRoleInput = z.infer<typeof assignRoleSchema>

type SortableField = 'createdAt' | 'email' | 'lastLoginAt' | 'status'

export const listUsersQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sort: z
      .string()
      .regex(/^(createdAt|email|lastLoginAt|status):(asc|desc)$/)
      .default('createdAt:desc')
      .transform((value) => {
        const [field, direction] = value.split(':') as [SortableField, 'asc' | 'desc']
        return { field, direction }
      }),
    status: z.enum(USER_STATUSES).optional(),
    roleId: objectIdSchema.optional(),
    search: z.string().trim().min(1).max(254).optional(),
    includeDeleted: z.coerce.boolean().default(false),
  })
  .strict()
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>

export const exportUsersQuerySchema = listUsersQuerySchema.omit({ page: true, limit: true })
export type ExportUsersQuery = z.infer<typeof exportUsersQuerySchema>

export const paginationQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict()
export type PaginationQuery = z.infer<typeof paginationQuerySchema>

export const BULK_ACTIONS = ['activate', 'deactivate', 'delete'] as const
export type BulkAction = (typeof BULK_ACTIONS)[number]

export const bulkActionSchema = z
  .object({
    action: z.enum(BULK_ACTIONS),
    userIds: z.array(objectIdSchema).min(1).max(100),
  })
  .strict()
export type BulkActionInput = z.infer<typeof bulkActionSchema>
