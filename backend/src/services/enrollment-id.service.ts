import { CounterModel } from '../models/counter.model'

const COUNTER_NAME = 'enrollment'
const SEQUENCE_PAD_LENGTH = 6

/**
 * `DM-ENR-{creationYear}-{sequence}` — same design as `batch-id.service.ts`/
 * `course-id.service.ts`, reusing the shared `counters` collection with its
 * own named counter document. Atomic `$inc` via `findOneAndUpdate` for
 * concurrency safety under parallel enrollment creation.
 */
export async function generateEnrollmentCode(): Promise<string> {
  const counter = await CounterModel.findOneAndUpdate(
    { _id: COUNTER_NAME },
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  )

  const year = new Date().getFullYear()
  const sequence = counter.seq.toString().padStart(SEQUENCE_PAD_LENGTH, '0')
  return `DM-ENR-${String(year)}-${sequence}`
}
