import type { Types } from 'mongoose'
import { Schema, model, type HydratedDocument } from 'mongoose'

import { applyAuditPlugin, auditFieldsDefinition } from './plugins/audit-fields.plugin'
import type { AuditFields } from './shared/audit-fields.type'

export const INTERVIEW_STATUSES = [
  'APPLIED',
  'SHORTLISTED',
  'INTERVIEW_SCHEDULED',
  'INTERVIEWED',
  'OFFERED',
  'REJECTED',
  'WITHDRAWN',
] as const
export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number]

export const INTERVIEW_ROUND_MODES = ['ONLINE', 'OFFLINE', 'PHONE'] as const
export type InterviewRoundMode = (typeof INTERVIEW_ROUND_MODES)[number]

export const INTERVIEW_ROUND_RESULTS = ['PENDING', 'PASS', 'FAIL'] as const
export type InterviewRoundResult = (typeof INTERVIEW_ROUND_RESULTS)[number]

export interface IInterviewRound {
  roundNumber: number
  scheduledAt: Date
  mode: InterviewRoundMode
  feedback: string | null
  result: InterviewRoundResult
}

/**
 * One document per student-company application. `rounds` is embedded — a
 * small, bounded list always read/written together with its parent
 * application, never queried independently across interviews.
 */
export interface IInterview extends AuditFields {
  studentId: Types.ObjectId
  companyId: Types.ObjectId
  role: string
  offeredPackage: number | null
  status: InterviewStatus
  rounds: IInterviewRound[]
  appliedAt: Date
}

export type InterviewDocument = HydratedDocument<IInterview>

const interviewRoundSchema = new Schema<IInterviewRound>(
  {
    roundNumber: { type: Number, required: true, min: 1 },
    scheduledAt: { type: Date, required: true },
    mode: { type: String, enum: INTERVIEW_ROUND_MODES, required: true },
    feedback: { type: String, default: null, trim: true, maxlength: 2000 },
    result: { type: String, enum: INTERVIEW_ROUND_RESULTS, default: 'PENDING' },
  },
  { _id: false },
)

const interviewSchema = new Schema<IInterview>({
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  role: { type: String, required: true, trim: true, maxlength: 150 },
  offeredPackage: { type: Number, default: null, min: 0 },
  status: { type: String, enum: INTERVIEW_STATUSES, default: 'APPLIED' },
  rounds: { type: [interviewRoundSchema], default: [] },
  appliedAt: { type: Date, default: Date.now },
  ...auditFieldsDefinition,
})

applyAuditPlugin(interviewSchema)

interviewSchema.index({ studentId: 1, status: 1 })
interviewSchema.index({ companyId: 1 })

export const InterviewModel = model<IInterview>('Interview', interviewSchema, 'interviews')
