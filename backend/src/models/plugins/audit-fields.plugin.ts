import { Schema } from 'mongoose'

/**
 * Spread into every schema's field-definition object at construction time
 * (`new Schema<IX>({ ...xFields, ...auditFieldsDefinition })`), not applied
 * via `schema.add()` after construction: Mongoose's `Schema<T>.add()` ties
 * its accepted shape to the *exact* document type T, and a shared helper
 * generic over `T extends AuditFields` can never satisfy that for every
 * concrete model. Spreading into the constructor call lets TypeScript check
 * the combined literal against each model's own interface directly.
 */
export const auditFieldsDefinition = {
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
}

/** Timestamps are the one audit concern that's a schema *option*, not a field. */
export function applyAuditPlugin(schema: Schema): void {
  schema.set('timestamps', true)
}
