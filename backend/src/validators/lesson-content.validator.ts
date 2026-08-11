import { z } from 'zod'

export { lessonIdParamSchema, type LessonIdParam } from './curriculum.validator'

/**
 * Sanitized on write (`utils/html-sanitize.ts`) — this length cap bounds the
 * *pre-sanitization* payload the client can submit, keeping a single lesson
 * document nowhere near MongoDB's 16MB limit even with a generous margin for
 * markup overhead (DATABASE.md).
 */
export const updateTextContentSchema = z.object({ textContent: z.string().max(200_000) }).strict()
export type UpdateTextContentInput = z.infer<typeof updateTextContentSchema>

const BLOCKED_URL_SCHEMES = ['javascript:', 'data:', 'file:', 'ftp:']

/**
 * HTTPS (or HTTP, for local/dev content sources) only — `javascript:`/
 * `data:`/`file:`/`ftp:` are explicitly rejected regardless of what
 * `new URL()` would otherwise accept, matching SECURITY.md's external-link
 * scheme allowlist. No server-side fetch of the URL is ever performed
 * (SSRF avoidance) — this validates *shape* only.
 */
function assertSafeExternalUrl(value: string, ctx: z.RefinementCtx): void {
  const lower = value.trim().toLowerCase()
  if (BLOCKED_URL_SCHEMES.some((scheme) => lower.startsWith(scheme))) {
    ctx.addIssue({ code: 'custom', message: 'This URL scheme is not allowed', path: ['url'] })
    return
  }

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    ctx.addIssue({ code: 'custom', message: 'Enter a valid URL', path: ['url'] })
    return
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    ctx.addIssue({ code: 'custom', message: 'Only http(s) links are allowed', path: ['url'] })
  }
}

export const updateExternalLinkSchema = z
  .object({
    url: z.string().trim().min(1, 'URL is required').max(2048),
    label: z.string().trim().max(200).optional(),
    description: z.string().trim().max(1000).optional(),
    openInNewTab: z.boolean().default(true),
  })
  .strict()
  .superRefine((value, ctx) => {
    assertSafeExternalUrl(value.url, ctx)
  })
export type UpdateExternalLinkInput = z.infer<typeof updateExternalLinkSchema>

/** Reported by the client only after it completes a direct-to-Cloudinary upload using a server-issued signature — the `publicId` itself was server-chosen, never client-chosen (SECURITY.md §Signed Upload). */
export const confirmMediaAssetSchema = z
  .object({ publicId: z.string().trim().min(1).max(500) })
  .strict()
export type ConfirmMediaAssetInput = z.infer<typeof confirmMediaAssetSchema>

/** `originalFilename` is display-only cosmetic metadata (never used for storage paths or security decisions), so it's the one field this endpoint accepts as client-reported. */
export const confirmDocumentSchema = z
  .object({
    publicId: z.string().trim().min(1).max(500),
    originalFilename: z.string().trim().min(1).max(255),
  })
  .strict()
export type ConfirmDocumentInput = z.infer<typeof confirmDocumentSchema>
