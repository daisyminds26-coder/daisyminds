import type { Types } from 'mongoose'

import {
  UserSessionModel,
  type IUserSession,
  type UserSessionDocument,
} from '../models/user-session.model'

export const userSessionRepository = {
  create(data: Partial<IUserSession>): Promise<UserSessionDocument> {
    return UserSessionModel.create(data)
  },

  findActiveById(sessionId: string): Promise<UserSessionDocument | null> {
    return UserSessionModel.findOne({ _id: sessionId, revokedAt: null }).select('+refreshTokenHash')
  },

  findActiveByUserId(userId: string): Promise<UserSessionDocument[]> {
    return UserSessionModel.find({ userId, revokedAt: null }).sort({ lastUsedAt: -1 })
  },

  async rotate(sessionId: string, newTokenHash: string, newExpiresAt: Date): Promise<void> {
    await UserSessionModel.updateOne(
      { _id: sessionId },
      { refreshTokenHash: newTokenHash, expiresAt: newExpiresAt, lastUsedAt: new Date() },
    )
  },

  async revokeById(sessionId: string): Promise<void> {
    await UserSessionModel.updateOne({ _id: sessionId }, { revokedAt: new Date() })
  },

  async revokeAllForUser(userId: string, exceptSessionId?: string): Promise<void> {
    const filter: { userId: string; revokedAt: null; _id?: { $ne: Types.ObjectId | string } } = {
      userId,
      revokedAt: null,
    }
    if (exceptSessionId) {
      filter._id = { $ne: exceptSessionId }
    }

    await UserSessionModel.updateMany(filter, { revokedAt: new Date() })
  },
}
