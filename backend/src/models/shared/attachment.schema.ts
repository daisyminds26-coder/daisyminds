import { Schema } from 'mongoose'

/**
 * Small embedded file reference used where attachments are fixed at
 * creation and don't need their own independently-managed lifecycle
 * (assignments, submissions) — contrast with `lesson_resources`, a full
 * collection because a lesson's resources are added/removed over time
 * independently of the lesson itself.
 */
export interface IAttachment {
  url: string
  fileName: string
  fileType: string
}

export const attachmentSchema = new Schema<IAttachment>(
  {
    url: { type: String, required: true, trim: true },
    fileName: { type: String, required: true, trim: true, maxlength: 255 },
    fileType: { type: String, required: true, trim: true, maxlength: 20 },
  },
  { _id: false },
)
