import type { Types } from 'mongoose'
import { Schema, model, type HydratedDocument } from 'mongoose'

import { applyAuditPlugin, auditFieldsDefinition } from './plugins/audit-fields.plugin'
import { APPROVAL_STATUSES, type ApprovalStatus } from './shared/enums'
import type { AuditFields } from './shared/audit-fields.type'

/**
 * Structurally close to `quizzes` but with stricter integrity needs:
 * a fixed exam window (`scheduledStart`/`scheduledEnd`) and mandatory
 * `durationMinutes`, enforced server-side at attempt time (not modeled
 * here — that's business logic). Proctoring is out of scope for V1
 * (PROJECT-UNDERSTANDING-REPORT.md) — no proctoring fields.
 */
export interface IExamination extends AuditFields {
  courseId: Types.ObjectId
  batchId: Types.ObjectId | null
  title: string
  questionIds: Types.ObjectId[]
  totalMarks: number
  passingMarks: number
  durationMinutes: number
  scheduledStart: Date
  scheduledEnd: Date
  maxAttempts: number
  status: ApprovalStatus
}

export type ExaminationDocument = HydratedDocument<IExamination>

const examinationSchema = new Schema<IExamination>({
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  batchId: { type: Schema.Types.ObjectId, ref: 'Batch', default: null },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  questionIds: { type: [Schema.Types.ObjectId], ref: 'Question', default: [] },
  totalMarks: { type: Number, required: true, min: 0 },
  passingMarks: { type: Number, required: true, min: 0 },
  durationMinutes: { type: Number, required: true, min: 1 },
  scheduledStart: { type: Date, required: true },
  scheduledEnd: { type: Date, required: true },
  maxAttempts: { type: Number, default: 1, min: 1 },
  status: { type: String, enum: APPROVAL_STATUSES, default: 'DRAFT' },
  ...auditFieldsDefinition,
})

applyAuditPlugin(examinationSchema)

examinationSchema.index({ courseId: 1 })
examinationSchema.index({ batchId: 1, scheduledStart: 1 })

export const ExaminationModel = model<IExamination>(
  'Examination',
  examinationSchema,
  'examinations',
)
