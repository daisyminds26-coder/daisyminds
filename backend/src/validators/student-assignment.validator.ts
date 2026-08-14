import { z } from 'zod'

const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id')

export const studentAssignmentIdParamSchema = z.object({ id: objectIdSchema }).strict()
export type StudentAssignmentIdParam = z.infer<typeof studentAssignmentIdParamSchema>

export const studentFileIdParamSchema = z
  .object({ id: objectIdSchema, fileId: objectIdSchema })
  .strict()
export type StudentFileIdParam = z.infer<typeof studentFileIdParamSchema>

export const studentAttachmentIdParamSchema = z
  .object({ id: objectIdSchema, attachmentId: objectIdSchema })
  .strict()
export type StudentAttachmentIdParam = z.infer<typeof studentAttachmentIdParamSchema>

/** HTTPS only — `javascript:`/`data:`/`file:`/`ftp:` (and every other scheme) are all rejected simply by requiring the `https://` prefix; the URL is never fetched server-side (no SSRF surface). */
const httpsUrlSchema = z
  .string()
  .trim()
  .max(1000)
  .refine((value) => value.startsWith('https://'), { message: 'Only HTTPS links are allowed' })

const responseFields = {
  textResponse: z.string().trim().max(20_000).optional(),
  linkResponse: httpsUrlSchema.optional(),
}

export const saveDraftSchema = z.object(responseFields).strict()
export type SaveDraftInput = z.infer<typeof saveDraftSchema>

export const submitAssignmentSchema = z.object(responseFields).strict()
export type SubmitAssignmentInput = z.infer<typeof submitAssignmentSchema>

export const uploadFileSchema = z
  .object({
    publicId: z.string().trim().min(1),
    filename: z.string().trim().min(1).max(255),
  })
  .strict()
export type UploadFileInput = z.infer<typeof uploadFileSchema>
