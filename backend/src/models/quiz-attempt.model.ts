import type { Types } from 'mongoose'
import { Schema, model, type HydratedDocument } from 'mongoose'

import { applyAuditPlugin, auditFieldsDefinition } from './plugins/audit-fields.plugin'
import { attemptAnswerSchema, type IAttemptAnswer } from './shared/attempt-answer.schema'
import type { AuditFields } from './shared/audit-fields.type'

export const QUIZ_ATTEMPT_STATUSES = ['IN_PROGRESS', 'SUBMITTED', 'EXPIRED'] as const
export type QuizAttemptStatus = (typeof QUIZ_ATTEMPT_STATUSES)[number]

export interface IQuizAttempt extends AuditFields {
  quizId: Types.ObjectId
  studentId: Types.ObjectId
  enrollmentId: Types.ObjectId | null
  answers: IAttemptAnswer[]
  score: number | null
  attemptNumber: number
  startedAt: Date
  submittedAt: Date | null
  status: QuizAttemptStatus
}

export type QuizAttemptDocument = HydratedDocument<IQuizAttempt>

const quizAttemptSchema = new Schema<IQuizAttempt>({
  quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  enrollmentId: { type: Schema.Types.ObjectId, ref: 'Enrollment', default: null },
  answers: { type: [attemptAnswerSchema], default: [] },
  score: { type: Number, default: null, min: 0 },
  attemptNumber: { type: Number, required: true, min: 1 },
  startedAt: { type: Date, required: true },
  submittedAt: { type: Date, default: null },
  status: { type: String, enum: QUIZ_ATTEMPT_STATUSES, default: 'IN_PROGRESS' },
  ...auditFieldsDefinition,
})

applyAuditPlugin(quizAttemptSchema)

quizAttemptSchema.index({ quizId: 1, studentId: 1, attemptNumber: 1 }, { unique: true })
quizAttemptSchema.index({ studentId: 1, quizId: 1 })

export const QuizAttemptModel = model<IQuizAttempt>(
  'QuizAttempt',
  quizAttemptSchema,
  'quiz_attempts',
)
