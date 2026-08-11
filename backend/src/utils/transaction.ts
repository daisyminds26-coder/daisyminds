import mongoose, { type ClientSession } from 'mongoose'

/**
 * The first transaction used anywhere in this codebase (Phase 9B curriculum
 * reorder/module-delete-cascade) — every other module's writes are single-
 * document and don't need one. `session.withTransaction` retries transient
 * transaction errors (e.g. a write conflict) internally per the MongoDB
 * driver's own documented contract, and always ends the session. Requires a
 * replica set (MongoDB Atlas in production always is one; local tests use a
 * dedicated single-node `MongoMemoryReplSet`, see `tests/setup-db.ts` —
 * every other test file's plain `MongoMemoryServer` standalone instance is
 * untouched and unaffected).
 */
export async function withTransaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession()
  try {
    let result: T | undefined
    await session.withTransaction(async () => {
      result = await fn(session)
    })
    return result as T
  } finally {
    await session.endSession()
  }
}
