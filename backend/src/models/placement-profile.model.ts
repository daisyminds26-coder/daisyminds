import type { Types } from 'mongoose'
import { Schema, model, type HydratedDocument } from 'mongoose'

import { applyAuditPlugin, auditFieldsDefinition } from './plugins/audit-fields.plugin'
import type { AuditFields } from './shared/audit-fields.type'

/**
 * 1:1 with `students` — a student's placement-facing profile. `consentGiven`
 * gates whether this data (and interview activity) may be shared with
 * employers at all; exact consent flow is a pending business rule
 * (PROJECT-UNDERSTANDING-REPORT.md §8), so this is captured but not yet
 * enforced at the schema level (that's service-layer authorization).
 */
export interface IPlacementProfile extends AuditFields {
  studentId: Types.ObjectId
  resumeUrl: string | null
  skills: string[]
  preferredRoles: string[]
  preferredLocations: string[]
  expectedPackage: number | null
  isActivelySeeking: boolean
  consentGiven: boolean
  consentGivenAt: Date | null
}

export type PlacementProfileDocument = HydratedDocument<IPlacementProfile>

const placementProfileSchema = new Schema<IPlacementProfile>({
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  resumeUrl: { type: String, default: null },
  skills: { type: [String], default: [] },
  preferredRoles: { type: [String], default: [] },
  preferredLocations: { type: [String], default: [] },
  expectedPackage: { type: Number, default: null, min: 0 },
  isActivelySeeking: { type: Boolean, default: true },
  consentGiven: { type: Boolean, default: false },
  consentGivenAt: { type: Date, default: null },
  ...auditFieldsDefinition,
})

applyAuditPlugin(placementProfileSchema)

placementProfileSchema.index(
  { studentId: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
)
placementProfileSchema.index({ skills: 1 })

export const PlacementProfileModel = model<IPlacementProfile>(
  'PlacementProfile',
  placementProfileSchema,
  'placement_profiles',
)
