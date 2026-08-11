import type { UpdateQuery } from 'mongoose'

import { UserModel, type IUser, type UserDocument, type UserStatus } from '../models/user.model'

/** Mongoose 9 no longer exports a `FilterQuery` type — this is deliberately loose, matching what `Model.find()` actually accepts. */
type UserFilter = Record<string, unknown>

/**
 * Auth's query patterns are non-trivial enough (several distinct selective
 * lookups, each needing different `select()`d secret fields) to warrant a
 * repository layer per CODING-STANDARDS.md §2.
 */

export interface ListUsersFilter {
  status?: UserStatus
  roleId?: string
  search?: string
  includeDeleted?: boolean
}

export interface ListUsersOptions {
  page: number
  limit: number
  sortField: 'createdAt' | 'email' | 'lastLoginAt' | 'status'
  sortDirection: 'asc' | 'desc'
}

export interface ListUsersResult {
  users: UserDocument[]
  total: number
}

/** Escapes regex metacharacters in user-supplied search input before building a `$regex` filter. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildListFilter(filter: ListUsersFilter): UserFilter {
  const query: UserFilter = {}

  if (!filter.includeDeleted) {
    query.isDeleted = false
  }
  if (filter.status) {
    query.status = filter.status
  }
  if (filter.roleId) {
    query.roleId = filter.roleId
  }
  if (filter.search) {
    // Prefix match on the unique email index (DATABASE.md §3.1 — "no text index needed for an exact-ish field").
    query.email = { $regex: `^${escapeRegExp(filter.search.toLowerCase())}` }
  }

  return query
}

export const userRepository = {
  findByEmail(email: string): Promise<UserDocument | null> {
    return UserModel.findOne({ email: email.toLowerCase(), isDeleted: false })
  },

  findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return UserModel.findOne({ email: email.toLowerCase(), isDeleted: false }).select(
      '+passwordHash',
    )
  },

  findById(id: string): Promise<UserDocument | null> {
    return UserModel.findOne({ _id: id, isDeleted: false })
  },

  /** Restore needs to load a soft-deleted document, which `findById` deliberately excludes. */
  findByIdIncludingDeleted(id: string): Promise<UserDocument | null> {
    return UserModel.findOne({ _id: id })
  },

  findByIdWithPassword(id: string): Promise<UserDocument | null> {
    return UserModel.findOne({ _id: id, isDeleted: false }).select('+passwordHash')
  },

  findByEmailVerificationTokenHash(hash: string): Promise<UserDocument | null> {
    return UserModel.findOne({
      emailVerificationTokenHash: hash,
      isDeleted: false,
    }).select('+emailVerificationTokenHash')
  },

  findByPasswordResetTokenHash(hash: string): Promise<UserDocument | null> {
    return UserModel.findOne({
      passwordResetTokenHash: hash,
      isDeleted: false,
    }).select('+passwordResetTokenHash')
  },

  create(data: Partial<IUser>): Promise<UserDocument> {
    return UserModel.create(data)
  },

  async updateById(id: string, update: UpdateQuery<IUser>): Promise<UserDocument | null> {
    return UserModel.findByIdAndUpdate(id, update, { new: true })
  },

  async list(filter: ListUsersFilter, options: ListUsersOptions): Promise<ListUsersResult> {
    const query = buildListFilter(filter)
    const sort = { [options.sortField]: options.sortDirection === 'asc' ? 1 : -1 } as const
    const skip = (options.page - 1) * options.limit

    const [users, total] = await Promise.all([
      UserModel.find(query).sort(sort).skip(skip).limit(options.limit),
      UserModel.countDocuments(query),
    ])

    return { users, total }
  },

  /** Every filtered row, unpaginated — CSV export needs the full matching set, not one page. */
  async listAll(filter: ListUsersFilter): Promise<UserDocument[]> {
    return UserModel.find(buildListFilter(filter)).sort({ createdAt: -1 })
  },

  /**
   * Used by the "last SUPER_ADMIN" guard: how many ACTIVE, non-deleted
   * users currently hold `roleId`, optionally excluding the user about to
   * be changed (so the count reflects the state *after* the pending action).
   */
  countActiveByRole(roleId: string, excludeUserId?: string): Promise<number> {
    const query: UserFilter = { roleId, status: 'ACTIVE', isDeleted: false }
    if (excludeUserId) {
      query._id = { $ne: excludeUserId }
    }
    return UserModel.countDocuments(query)
  },

  async softDeleteById(id: string, actorId: string): Promise<UserDocument | null> {
    return UserModel.findByIdAndUpdate(
      id,
      { isDeleted: true, deletedAt: new Date(), updatedBy: actorId },
      { new: true },
    )
  },

  async restoreById(id: string, actorId: string): Promise<UserDocument | null> {
    return UserModel.findByIdAndUpdate(
      id,
      { isDeleted: false, deletedAt: null, updatedBy: actorId },
      { new: true },
    )
  },
}
