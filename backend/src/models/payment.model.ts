import type { Types } from 'mongoose'
import { Schema, model, type HydratedDocument } from 'mongoose'

import { applyAuditPlugin, auditFieldsDefinition } from './plugins/audit-fields.plugin'
import { CURRENCY_CODES, type CurrencyCode } from './shared/enums'
import type { AuditFields } from './shared/audit-fields.type'

export const PAYMENT_STATUSES = ['INITIATED', 'SUCCESS', 'FAILED', 'REFUNDED'] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

/**
 * Financial records are immutable — corrections are new documents (e.g. a
 * refund is tracked via `refundedAmount` + a new gateway transaction, never
 * an edit to this one). `isDeleted`/`deletedAt` exist for schema consistency
 * only; the service layer must never soft-delete a payment.
 * `rawGatewayPayload` never contains raw card data — gateway-hosted checkout
 * only (ARCHITECTURE.md §10), so this stays out of PCI-DSS card-data scope.
 */
export interface IPayment extends AuditFields {
  invoiceId: Types.ObjectId
  studentId: Types.ObjectId
  amount: number
  currency: CurrencyCode
  gatewayProvider: string
  gatewayTransactionId: string
  status: PaymentStatus
  rawGatewayPayload: Record<string, unknown>
  refundedAmount: number
  paidAt: Date | null
}

export type PaymentDocument = HydratedDocument<IPayment>

const paymentSchema = new Schema<IPayment>({
  invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, enum: CURRENCY_CODES, default: 'INR' },
  gatewayProvider: { type: String, required: true, trim: true, maxlength: 60 },
  gatewayTransactionId: { type: String, required: true, trim: true },
  status: { type: String, enum: PAYMENT_STATUSES, default: 'INITIATED' },
  rawGatewayPayload: { type: Schema.Types.Mixed, default: {} },
  refundedAmount: { type: Number, default: 0, min: 0 },
  paidAt: { type: Date, default: null },
  ...auditFieldsDefinition,
})

applyAuditPlugin(paymentSchema)

paymentSchema.index({ gatewayTransactionId: 1 }, { unique: true })
paymentSchema.index({ studentId: 1, status: 1 })
paymentSchema.index({ invoiceId: 1 })

export const PaymentModel = model<IPayment>('Payment', paymentSchema, 'payments')
