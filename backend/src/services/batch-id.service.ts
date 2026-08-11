import { CounterModel } from '../models/counter.model'

const COUNTER_NAME = 'batch'
const SEQUENCE_PAD_LENGTH = 6

/**
 * `DM-BAT-{creationYear}-{sequence}` — same design as `course-id.service.ts`/
 * `student-id.service.ts`/`trainer-id.service.ts`, reusing the shared
 * `counters` collection with its own named counter document (`_id: 'batch'`).
 * Single global, never-reset-per-year sequence; atomic `$inc` via
 * `findOneAndUpdate` for concurrency safety under parallel batch creation.
 * Deliberately not course-title-derived (task's own "do not build fragile
 * parsing logic around course titles" instruction) — a plain global sequence
 * is simpler and never collides or breaks on a renamed/duplicated course.
 */
export async function generateBatchCode(): Promise<string> {
  const counter = await CounterModel.findOneAndUpdate(
    { _id: COUNTER_NAME },
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  )

  const year = new Date().getFullYear()
  const sequence = counter.seq.toString().padStart(SEQUENCE_PAD_LENGTH, '0')
  return `DM-BAT-${String(year)}-${sequence}`
}
