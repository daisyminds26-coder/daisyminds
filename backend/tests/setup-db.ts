import mongoose from 'mongoose'
import { MongoMemoryReplSet, MongoMemoryServer } from 'mongodb-memory-server'
import { afterAll, afterEach, beforeAll } from 'vitest'

import '../src/models'

/**
 * Opt-in per test file (call at module scope, not inside a `describe`) —
 * most tests (health checks, unit tests) deliberately have no DB at all
 * (tests/setup.ts). Only auth integration tests, which need real Mongoose
 * queries against real schemas, need this — CODING-STANDARDS.md §6 calls
 * for "in-memory/test DB" integration tests specifically for this reason.
 * Vitest runs each test file in its own isolated context, so each file
 * gets its own MongoMemoryServer instance — never real Mongo Atlas.
 */
export function setupTestDatabase(): void {
  let mongod: MongoMemoryServer

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create()
    await mongoose.connect(mongod.getUri())
  })

  afterEach(async () => {
    const collections = mongoose.connection.collections
    await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})))
  })

  afterAll(async () => {
    await mongoose.disconnect()
    await mongod.stop()
  })
}

/**
 * A single-node replica set, not the plain standalone `MongoMemoryServer`
 * above — `utils/transaction.ts#withTransaction` (Phase 9B curriculum
 * reorder/module-delete-cascade) needs `session.startTransaction()`, which
 * a standalone `mongod` rejects outright. MongoDB Atlas (production) is
 * always a replica set, so this exercises the exact same code path
 * production uses. Only curriculum test files pay this slower startup
 * cost — every other test file's `setupTestDatabase()` above is untouched.
 */
export function setupTransactionalTestDatabase(): void {
  let replSet: MongoMemoryReplSet

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
    await mongoose.connect(replSet.getUri())
  })

  afterEach(async () => {
    const collections = mongoose.connection.collections
    await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})))
  })

  afterAll(async () => {
    await mongoose.disconnect()
    await replSet.stop()
  })
}
