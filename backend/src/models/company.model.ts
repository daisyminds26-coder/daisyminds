import { Schema, model, type HydratedDocument } from 'mongoose'

import { applyAuditPlugin, auditFieldsDefinition } from './plugins/audit-fields.plugin'
import type { AuditFields } from './shared/audit-fields.type'

export interface IContact {
  name: string | null
  email: string | null
  phone: string | null
}

/** Employer catalog for the placement domain — referenced by `interviews`. */
export interface ICompany extends AuditFields {
  name: string
  industry: string | null
  website: string | null
  contact: IContact
  isActive: boolean
  notes: string | null
}

export type CompanyDocument = HydratedDocument<ICompany>

const contactSchema = new Schema<IContact>(
  {
    name: { type: String, default: null, trim: true, maxlength: 150 },
    email: { type: String, default: null, trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, default: null, trim: true, maxlength: 20 },
  },
  { _id: false },
)

const companySchema = new Schema<ICompany>({
  name: { type: String, required: true, trim: true, maxlength: 200 },
  industry: { type: String, default: null, trim: true, maxlength: 100 },
  website: { type: String, default: null, trim: true },
  contact: { type: contactSchema, default: () => ({}) },
  isActive: { type: Boolean, default: true },
  notes: { type: String, default: null, trim: true, maxlength: 2000 },
  ...auditFieldsDefinition,
})

applyAuditPlugin(companySchema)

companySchema.index({ name: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } })
companySchema.index({ isActive: 1 })
companySchema.index({ name: 'text' })

export const CompanyModel = model<ICompany>('Company', companySchema, 'companies')
