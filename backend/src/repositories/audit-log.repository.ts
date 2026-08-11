import type { Types } from 'mongoose'

import { AuditLogModel, type AuditLogDocument } from '../models/audit-log.model'

export interface RecordAuditEventInput {
  actorId: string | null
  actorRole: string | null
  action: string
  entityType: string
  entityId: Types.ObjectId | string
  metadata?: Record<string, unknown>
  ipAddress?: string | null
  userAgent?: string | null
}

export interface FindByEntityResult {
  entries: AuditLogDocument[]
  total: number
}

/**
 * Append-only — `audit_logs` has no update path (DATABASE.md §3.1), so
 * besides `record`, this repository only exposes reads.
 */
export const auditLogRepository = {
  async record(input: RecordAuditEventInput): Promise<void> {
    await AuditLogModel.create({
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata ?? {},
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    })
  },

  /** "History for entity X" — offset-paginated by `createdAt` desc (DATABASE.md §3.1's documented access pattern). */
  async findByEntity(
    entityType: string,
    entityId: string,
    page: number,
    limit: number,
  ): Promise<FindByEntityResult> {
    const query = { entityType, entityId }
    const skip = (page - 1) * limit

    const [entries, total] = await Promise.all([
      AuditLogModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      AuditLogModel.countDocuments(query),
    ])

    return { entries, total }
  },
}
