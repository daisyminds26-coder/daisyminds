import { z } from 'zod'

/**
 * No cross-field `.superRefine()`/`.refine()` anywhere — same rule
 * `features/batches/schemas/batch.schemas.ts` documents (breaks
 * `zodResolver`'s generic inference for `Control<T>`-typed field
 * components). These forms are small enough that it barely matters here,
 * but the rule is kept for consistency across the app's form schemas.
 */
export const createEnrollmentSchema = z
  .object({
    studentId: z.string().min(1, 'Select a student'),
    batchId: z.string().min(1, 'Select a batch'),
  })
  .strict()
export type CreateEnrollmentFormValues = z.input<typeof createEnrollmentSchema>

export const cancelEnrollmentSchema = z
  .object({ reason: z.string().trim().max(500).optional().or(z.literal('')) })
  .strict()
export type CancelEnrollmentFormValues = z.input<typeof cancelEnrollmentSchema>

export const dropEnrollmentSchema = z
  .object({ reason: z.string().trim().max(500).optional().or(z.literal('')) })
  .strict()
export type DropEnrollmentFormValues = z.input<typeof dropEnrollmentSchema>

export const transferEnrollmentSchema = z
  .object({
    targetBatchId: z.string().min(1, 'Select a target batch'),
    reason: z.string().trim().max(500).optional().or(z.literal('')),
  })
  .strict()
export type TransferEnrollmentFormValues = z.input<typeof transferEnrollmentSchema>

export const bulkEnrollSchema = z
  .object({
    batchId: z.string().min(1, 'Select a batch'),
    studentIds: z.array(z.string()).min(1, 'Select at least one student').max(100),
  })
  .strict()
export type BulkEnrollFormValues = z.input<typeof bulkEnrollSchema>
