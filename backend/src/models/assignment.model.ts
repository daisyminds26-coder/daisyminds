import type { Types } from 'mongoose'
import { Schema, model, type HydratedDocument } from 'mongoose'

import { applyAuditPlugin, auditFieldsDefinition } from './plugins/audit-fields.plugin'
import { APPROVAL_STATUSES, type ApprovalStatus } from './shared/enums'
import { attachmentSchema, type IAttachment } from './shared/attachment.schema'
import type { AuditFields } from './shared/audit-fields.type'

export interface IAssignment extends AuditFields {
  batchId: Types.ObjectId
  courseId: Types.ObjectId
  title: string
  description: string
  attachments: IAttachment[]
  dueDate: Date
  maxScore: number
  allowLateSubmission: boolean
  status: ApprovalStatus
}

export type AssignmentDocument = HydratedDocument<IAssignment>

const assignmentSchema = new Schema<IAssignment>({
  batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, default: '', trim: true, maxlength: 5000 },
  attachments: { type: [attachmentSchema], default: [] },
  dueDate: { type: Date, required: true },
  maxScore: { type: Number, required: true, min: 0 },
  allowLateSubmission: { type: Boolean, default: false },
  status: { type: String, enum: APPROVAL_STATUSES, default: 'DRAFT' },
  ...auditFieldsDefinition,
})

applyAuditPlugin(assignmentSchema)

assignmentSchema.index({ batchId: 1, dueDate: 1 })
assignmentSchema.index({ courseId: 1 })

export const AssignmentModel = model<IAssignment>('Assignment', assignmentSchema, 'assignments')
