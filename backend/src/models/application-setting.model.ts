import { Schema, model, type HydratedDocument } from 'mongoose'

import { applyAuditPlugin, auditFieldsDefinition } from './plugins/audit-fields.plugin'
import type { AuditFields } from './shared/audit-fields.type'

/**
 * One document per system-wide config key (e.g. `attendance.minPercentage`,
 * `fees.latePenaltyPercent`) rather than one giant singleton document —
 * avoids write contention between unrelated settings and lets each be
 * audited/CRUD'd independently. Deliberately not one collection per setting
 * *type* (CLAUDE.md — never create unnecessary collections); this single
 * collection holds all of them, keyed by `key`.
 */
export interface IApplicationSetting extends AuditFields {
  key: string
  value: unknown
  description: string | null
  category: string | null
}

export type ApplicationSettingDocument = HydratedDocument<IApplicationSetting>

const applicationSettingSchema = new Schema<IApplicationSetting>({
  key: { type: String, required: true, trim: true, maxlength: 150 },
  value: { type: Schema.Types.Mixed, required: true },
  description: { type: String, default: null, trim: true, maxlength: 500 },
  category: { type: String, default: null, trim: true, maxlength: 100 },
  ...auditFieldsDefinition,
})

applyAuditPlugin(applicationSettingSchema)

applicationSettingSchema.index({ key: 1 }, { unique: true })
applicationSettingSchema.index({ category: 1 })

export const ApplicationSettingModel = model<IApplicationSetting>(
  'ApplicationSetting',
  applicationSettingSchema,
  'application_settings',
)
