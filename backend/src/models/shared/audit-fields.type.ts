import type { Types } from 'mongoose'

/**
 * Present on every collection (DATABASE.md §1). `createdBy`/`updatedBy` are
 * nullable to accommodate system/seed-created documents (e.g. the first
 * SUPER_ADMIN, seeded roles) where no authenticated actor exists yet —
 * application services populate them from the authenticated actor for every
 * user-initiated write.
 */
export interface AuditFields {
  createdBy: Types.ObjectId | null
  updatedBy: Types.ObjectId | null
  createdAt: Date
  updatedAt: Date
  isDeleted: boolean
  deletedAt: Date | null
}
