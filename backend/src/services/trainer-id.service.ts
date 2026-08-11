import { CounterModel } from '../models/counter.model'

const COUNTER_NAME = 'trainer'
const SEQUENCE_PAD_LENGTH = 6

/**
 * `DM-TRN-{creationYear}-{sequence}` — same design as `student-id.service.ts`,
 * reusing the shared `counters` collection with its own named counter
 * document (`_id: 'trainer'`, independent of `_id: 'student'`). See that
 * file's comment for the full rationale (single global, never-reset-per-year
 * sequence; atomic `$inc` for concurrency safety).
 */
export async function generateTrainerId(): Promise<string> {
  const counter = await CounterModel.findOneAndUpdate(
    { _id: COUNTER_NAME },
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  )

  const year = new Date().getFullYear()
  const sequence = counter.seq.toString().padStart(SEQUENCE_PAD_LENGTH, '0')
  return `DM-TRN-${String(year)}-${sequence}`
}
