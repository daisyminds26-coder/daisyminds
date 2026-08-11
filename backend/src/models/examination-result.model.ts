import type { Types } from 'mongoose'
import { Schema, model, type HydratedDocument } from 'mongoose'

import { applyAuditPlugin, auditFieldsDefinition } from './plugins/audit-fields.plugin'
import { attemptAnswerSchema, type IAttemptAnswer } from './shared/attempt-answer.schema'
import type { AuditFields } from './shared/audit-fields.type'

export const EXAMINATION_RESULT_STATUSES = [
  'IN_PROGRESS',
  'SUBMITTED',
  'EXPIRED',
  'DISQUALIFIED',
] as const
export type ExaminationResultStatus = (typeof EXAMINATION_RESULT_STATUSES)[number]

export interface IExaminationResult extends AuditFields {
  examinationId: Types.ObjectId
  studentId: Types.ObjectId
  answers: IAttemptAnswer[]
  score: number | null
  passed: boolean | null
  attemptNumber: number
  startedAt: Date
  submittedAt: Date | null
  status: ExaminationResultStatus
}

export type ExaminationResultDocument = HydratedDocument<IExaminationResult>

const examinationResultSchema = new Schema<IExaminationResult>({
  examinationId: { type: Schema.Types.ObjectId, ref: 'Examination', required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  answers: { type: [attemptAnswerSchema], default: [] },
  score: { type: Number, default: null, min: 0 },
  passed: { type: Boolean, default: null },
  attemptNumber: { type: Number, required: true, min: 1 },
  startedAt: { type: Date, required: true },
  submittedAt: { type: Date, default: null },
  status: { type: String, enum: EXAMINATION_RESULT_STATUSES, default: 'IN_PROGRESS' },
  ...auditFieldsDefinition,
})

applyAuditPlugin(examinationResultSchema)

examinationResultSchema.index(
  { examinationId: 1, studentId: 1, attemptNumber: 1 },
  { unique: true },
)
examinationResultSchema.index({ studentId: 1, examinationId: 1 })

export const ExaminationResultModel = model<IExaminationResult>(
  'ExaminationResult',
  examinationResultSchema,
  'examination_results',
)
