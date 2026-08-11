import { Schema, model, type HydratedDocument } from 'mongoose'

import { applyAuditPlugin, auditFieldsDefinition } from './plugins/audit-fields.plugin'
import type { AuditFields } from './shared/audit-fields.type'

export const SYSTEM_ROLE_NAMES = ['SUPER_ADMIN', 'ADMIN', 'TRAINER', 'STUDENT'] as const
export type SystemRoleName = (typeof SYSTEM_ROLE_NAMES)[number]

/**
 * `permissions` is a denormalized array of permission keys (not references) —
 * this is read on every authorization check, so it must not require a join
 * against the `permissions` catalog collection at request time. The catalog
 * is the source of truth for *what keys exist*; a role simply lists which
 * ones it grants. System roles (isSystem: true) seed SYSTEM_ROLE_NAMES and
 * cannot be deleted or renamed — enforced at the service layer, not here.
 */
export interface IRole extends AuditFields {
  name: string
  description: string
  permissions: string[]
  isSystem: boolean
}

export type RoleDocument = HydratedDocument<IRole>

const roleSchema = new Schema<IRole>({
  name: { type: String, required: true, trim: true, uppercase: true, maxlength: 60 },
  description: { type: String, default: '', trim: true, maxlength: 300 },
  permissions: { type: [String], default: [] },
  isSystem: { type: Boolean, default: false },
  ...auditFieldsDefinition,
})

applyAuditPlugin(roleSchema)

roleSchema.index({ name: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } })
roleSchema.index({ permissions: 1 })

export const RoleModel = model<IRole>('Role', roleSchema, 'roles')
