import { CounterModel } from '../models/counter.model'

const COUNTER_NAME = 'course'
const SEQUENCE_PAD_LENGTH = 6

/**
 * `DM-CRS-{creationYear}-{sequence}` — same design as `student-id.service.ts`/
 * `trainer-id.service.ts`, reusing the shared `counters` collection with its
 * own named counter document (`_id: 'course'`). Single global, never-reset-
 * per-year sequence; atomic `$inc` via `findOneAndUpdate` for concurrency
 * safety under parallel course creation.
 */
export async function generateCourseCode(): Promise<string> {
  const counter = await CounterModel.findOneAndUpdate(
    { _id: COUNTER_NAME },
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  )

  const year = new Date().getFullYear()
  const sequence = counter.seq.toString().padStart(SEQUENCE_PAD_LENGTH, '0')
  return `DM-CRS-${String(year)}-${sequence}`
}
