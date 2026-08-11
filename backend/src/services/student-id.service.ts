import { CounterModel } from '../models/counter.model'

const COUNTER_NAME = 'student'
const SEQUENCE_PAD_LENGTH = 6

/**
 * `DM-STU-{creationYear}-{sequence}`. The sequence itself is a single
 * global, monotonically increasing counter — deliberately NOT reset per
 * calendar year. A per-year-reset counter would need a new counter
 * document at every year boundary and a decision about what happens to an
 * in-flight request straddling that boundary; a single global counter has
 * no such edge case and is still guaranteed unique forever, at the minor
 * cost of the numeric suffix not restarting at 000001 each January.
 *
 * Concurrency safety: `findOneAndUpdate` with `$inc` is one atomic
 * operation in MongoDB — two callers racing to create a student can never
 * observe or claim the same `seq`, unlike counting existing documents
 * (`StudentModel.countDocuments()`), which is not safe under concurrent
 * inserts.
 */
export async function generateStudentId(): Promise<string> {
  const counter = await CounterModel.findOneAndUpdate(
    { _id: COUNTER_NAME },
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  )

  const year = new Date().getFullYear()
  const sequence = counter.seq.toString().padStart(SEQUENCE_PAD_LENGTH, '0')
  return `DM-STU-${String(year)}-${sequence}`
}
