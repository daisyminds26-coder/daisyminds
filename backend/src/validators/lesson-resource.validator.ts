import { z } from 'zod'

import { lessonIdParamSchema } from './curriculum.validator'

const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id')

export const resourceIdParamSchema = lessonIdParamSchema
  .extend({ resourceId: objectIdSchema })
  .strict()
export type ResourceIdParam = z.infer<typeof resourceIdParamSchema>

/**
 * Reported by the client only after it completes a direct-to-Cloudinary
 * upload using a server-issued signature — `resourceType`/`format`/
 * `mimeType`/`bytes`/`filename` are never trusted from the client, they're
 * derived server-side from Cloudinary's own verified asset response
 * (SECURITY.md §Signed Upload). Title/description/downloadability are the
 * only fields genuinely authored by the admin here.
 */
export const confirmResourceSchema = z
  .object({
    publicId: z.string().trim().min(1).max(500),
    filename: z.string().trim().min(1).max(255),
    title: z.string().trim().min(1, 'Title is required').max(200),
    description: z.string().trim().max(1000).optional(),
    isDownloadable: z.boolean().default(true),
  })
  .strict()
export type ConfirmResourceInput = z.infer<typeof confirmResourceSchema>

export const updateResourceMetadataSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(200).optional(),
    description: z.string().trim().max(1000).optional(),
    isDownloadable: z.boolean().optional(),
  })
  .strict()
export type UpdateResourceMetadataInput = z.infer<typeof updateResourceMetadataSchema>

const reorderResourceItemSchema = z.object({
  id: objectIdSchema,
  order: z.coerce.number().int().min(0),
})

/** Bounded well below any practical per-lesson resource count — reorder payload must name every current resource exactly once, same contract as the curriculum reorder endpoints. */
export const reorderResourcesSchema = z
  .object({ items: z.array(reorderResourceItemSchema).min(1).max(200) })
  .strict()
  .superRefine((value, ctx) => {
    const ids = value.items.map((item) => item.id)
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: 'custom', message: 'Duplicate ids in reorder payload', path: ['items'] })
    }
    const orders = value.items.map((item) => item.order)
    if (new Set(orders).size !== orders.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'Duplicate order values in reorder payload',
        path: ['items'],
      })
    }
  })
export type ReorderResourcesInput = z.infer<typeof reorderResourcesSchema>
