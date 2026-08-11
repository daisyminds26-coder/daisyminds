import type { Types } from 'mongoose'
import { Schema, model, type HydratedDocument } from 'mongoose'

import { applyAuditPlugin, auditFieldsDefinition } from './plugins/audit-fields.plugin'
import { APPROVAL_STATUSES, type ApprovalStatus } from './shared/enums'
import type { AuditFields } from './shared/audit-fields.type'

export interface IQuiz extends AuditFields {
  courseId: Types.ObjectId
  courseModuleId: Types.ObjectId | null
  title: string
  description: string
  questionIds: Types.ObjectId[]
  totalMarks: number
  passingMarks: number
  timeLimitMinutes: number | null
  maxAttempts: number
  status: ApprovalStatus
}

export type QuizDocument = HydratedDocument<IQuiz>

const quizSchema = new Schema<IQuiz>({
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  courseModuleId: { type: Schema.Types.ObjectId, ref: 'CourseModule', default: null },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, default: '', trim: true, maxlength: 2000 },
  questionIds: { type: [Schema.Types.ObjectId], ref: 'Question', default: [] },
  totalMarks: { type: Number, required: true, min: 0 },
  passingMarks: { type: Number, required: true, min: 0 },
  timeLimitMinutes: { type: Number, default: null, min: 1 },
  maxAttempts: { type: Number, default: 1, min: 1 },
  status: { type: String, enum: APPROVAL_STATUSES, default: 'DRAFT' },
  ...auditFieldsDefinition,
})

applyAuditPlugin(quizSchema)

quizSchema.index({ courseId: 1 })
quizSchema.index({ courseModuleId: 1 })

export const QuizModel = model<IQuiz>('Quiz', quizSchema, 'quizzes')
