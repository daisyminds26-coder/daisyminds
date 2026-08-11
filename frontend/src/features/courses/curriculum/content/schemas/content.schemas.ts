import { z } from 'zod'

export const textContentFormSchema = z.object({ textContent: z.string() }).strict()
export type TextContentFormValues = z.input<typeof textContentFormSchema>

const BLOCKED_SCHEMES = ['javascript:', 'data:', 'file:', 'ftp:']

export const externalLinkFormSchema = z
  .object({
    url: z
      .string()
      .trim()
      .min(1, 'URL is required')
      .max(2048)
      .refine(
        (value) => !BLOCKED_SCHEMES.some((scheme) => value.toLowerCase().startsWith(scheme)),
        {
          message: 'This URL scheme is not allowed',
        },
      )
      .refine(
        (value) => {
          try {
            const parsed = new URL(value)
            return parsed.protocol === 'https:' || parsed.protocol === 'http:'
          } catch {
            return false
          }
        },
        { message: 'Enter a valid http(s) URL' },
      ),
    label: z.string().trim().max(200).optional().or(z.literal('')),
    description: z.string().trim().max(1000).optional().or(z.literal('')),
    openInNewTab: z.boolean().default(true),
  })
  .strict()
export type ExternalLinkFormValues = z.input<typeof externalLinkFormSchema>

export const resourceMetadataFormSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(200),
    description: z.string().trim().max(1000).optional().or(z.literal('')),
    isDownloadable: z.boolean().default(true),
  })
  .strict()
export type ResourceMetadataFormValues = z.input<typeof resourceMetadataFormSchema>
