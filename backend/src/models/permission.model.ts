import { Schema, model, type HydratedDocument } from 'mongoose'

import { applyAuditPlugin, auditFieldsDefinition } from './plugins/audit-fields.plugin'
import type { AuditFields } from './shared/audit-fields.type'

/**
 * Admin-facing catalog of atomic permission keys (`resource:action`), used to
 * build `roles.permissions`. Read when an admin edits a role's permission
 * set, not on the request hot path — `roles` embeds the actual keys a user's
 * authorization check reads (ARCHITECTURE.md — avoid unnecessary references).
 */
export interface IPermission extends AuditFields {
  key: string
  description: string
  category: string
  isSystem: boolean
}

export type PermissionDocument = HydratedDocument<IPermission>

const permissionSchema = new Schema<IPermission>({
  key: {
    type: String,
    required: true,
    trim: true,
    match: /^[a-z0-9]+(-[a-z0-9]+)*:[a-z0-9]+(-[a-z0-9]+)*$/,
  },
  description: { type: String, required: true, trim: true, maxlength: 300 },
  category: { type: String, required: true, trim: true, maxlength: 60 },
  isSystem: { type: Boolean, default: false },
  ...auditFieldsDefinition,
})

applyAuditPlugin(permissionSchema)

permissionSchema.index({ key: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } })
permissionSchema.index({ category: 1 })

export const PermissionModel = model<IPermission>('Permission', permissionSchema, 'permissions')
