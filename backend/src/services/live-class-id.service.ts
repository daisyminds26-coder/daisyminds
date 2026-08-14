import { CounterModel } from '../models/counter.model'

const COUNTER_NAME = 'live-class'
const SEQUENCE_PAD_LENGTH = 6

/** `DM-CLS-{creationYear}-{sequence}` — same design as `enrollment-id.service.ts`/`batch-id.service.ts`, reusing the shared `counters` collection with its own named counter document. Atomic `$inc` for concurrency safety. */
export async function generateLiveClassSessionCode(): Promise<string> {
  const counter = await CounterModel.findOneAndUpdate(
    { _id: COUNTER_NAME },
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  )

  const year = new Date().getFullYear()
  const sequence = counter.seq.toString().padStart(SEQUENCE_PAD_LENGTH, '0')
  return `DM-CLS-${String(year)}-${sequence}`
}
