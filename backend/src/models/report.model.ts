import type { Types } from 'mongoose'
import { Schema, model, type HydratedDocument } from 'mongoose'

import { applyAuditPlugin, auditFieldsDefinition } from './plugins/audit-fields.plugin'
import type { AuditFields } from './shared/audit-fields.type'

export const REPORT_STATUSES = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'] as const
export type ReportStatus = (typeof REPORT_STATUSES)[number]

/**
 * A record of an async, generated report EXPORT (CSV/PDF), produced by a
 * BullMQ job (ARCHITECTURE.md §6's `reports` queue) — not live dashboard
 * data, which stays as ad-hoc aggregation and is never persisted here.
 * This collection exists so a requester has a status/download link and
 * admins have an audit trail of who generated what, when.
 */
export interface IReport extends AuditFields {
  reportType: string
  requestedBy: Types.ObjectId
  parameters: Record<string, unknown>
  status: ReportStatus
  resultFileUrl: string | null
  failureReason: string | null
  generatedAt: Date | null
  expiresAt: Date | null
}

export type ReportDocument = HydratedDocument<IReport>

const reportSchema = new Schema<IReport>({
  reportType: { type: String, required: true, trim: true, maxlength: 100 },
  requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  parameters: { type: Schema.Types.Mixed, default: {} },
  status: { type: String, enum: REPORT_STATUSES, default: 'PENDING' },
  resultFileUrl: { type: String, default: null },
  failureReason: { type: String, default: null, trim: true, maxlength: 500 },
  generatedAt: { type: Date, default: null },
  expiresAt: { type: Date, default: null },
  ...auditFieldsDefinition,
})

applyAuditPlugin(reportSchema)

reportSchema.index({ requestedBy: 1, createdAt: -1 })
reportSchema.index({ status: 1 })
reportSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const ReportModel = model<IReport>('Report', reportSchema, 'reports')
