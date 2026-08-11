import type { Types } from 'mongoose'
import { Schema, model, type HydratedDocument } from 'mongoose'

import { applyAuditPlugin, auditFieldsDefinition } from './plugins/audit-fields.plugin'
import { CURRENCY_CODES, type CurrencyCode } from './shared/enums'
import type { AuditFields } from './shared/audit-fields.type'

export const INVOICE_STATUSES = ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'] as const
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

export interface IGstDetails {
  gstin: string | null
  hsnCode: string | null
  taxAmount: number | null
}

/**
 * `gstDetails` fields are nullable — GST invoicing is an unconfirmed
 * requirement (DATABASE.md §5); the shape is reserved so a future
 * confirmation doesn't require a schema migration, only populating
 * previously-null fields going forward.
 */
export interface IInvoice extends AuditFields {
  studentId: Types.ObjectId
  enrollmentId: Types.ObjectId | null
  feeAmount: number
  currency: CurrencyCode
  amountPaid: number
  status: InvoiceStatus
  dueDate: Date
  gstDetails: IGstDetails
}

export type InvoiceDocument = HydratedDocument<IInvoice>

const gstDetailsSchema = new Schema<IGstDetails>(
  {
    gstin: { type: String, default: null, trim: true, maxlength: 20 },
    hsnCode: { type: String, default: null, trim: true, maxlength: 20 },
    taxAmount: { type: Number, default: null, min: 0 },
  },
  { _id: false },
)

const invoiceSchema = new Schema<IInvoice>({
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  enrollmentId: { type: Schema.Types.ObjectId, ref: 'Enrollment', default: null },
  feeAmount: { type: Number, required: true, min: 0 },
  currency: { type: String, enum: CURRENCY_CODES, default: 'INR' },
  amountPaid: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: INVOICE_STATUSES, default: 'UNPAID' },
  dueDate: { type: Date, required: true },
  gstDetails: { type: gstDetailsSchema, default: () => ({}) },
  ...auditFieldsDefinition,
})

applyAuditPlugin(invoiceSchema)

invoiceSchema.index({ studentId: 1, status: 1 })
invoiceSchema.index({ enrollmentId: 1 })

export const InvoiceModel = model<IInvoice>('Invoice', invoiceSchema, 'invoices')
