import type { Types } from 'mongoose'
import { Schema } from 'mongoose'

/**
 * A Cloudinary-verified attachment reference (same fields the Admin API's
 * `verifyUploadedAsset()` returns) — never a bare/trusted client URL.
 * Shared, embedded shape for both an assignment's own resources and a
 * student submission's uploaded files. Deliberately keeps its own Mongo
 * `_id` (unlike `shared/attachment.schema.ts`'s bare `{_id: false}`
 * predecessor) — a Cloudinary `publicId` contains `/` characters, which
 * cannot round-trip through an Express path param, so every route that
 * targets one specific attachment (remove, delivery-url) addresses it by
 * this `_id` instead.
 */
export interface IAssignmentAttachment {
  _id: Types.ObjectId
  publicId: string
  assetId: string
  filename: string
  format: string
  mimeType: string
  bytes: number
}

export const assignmentAttachmentSchema = new Schema<IAssignmentAttachment>({
  publicId: { type: String, required: true, trim: true },
  assetId: { type: String, required: true, trim: true },
  filename: { type: String, required: true, trim: true, maxlength: 255 },
  format: { type: String, required: true, trim: true, maxlength: 20 },
  mimeType: { type: String, required: true, trim: true, maxlength: 150 },
  bytes: { type: Number, required: true, min: 0 },
})
