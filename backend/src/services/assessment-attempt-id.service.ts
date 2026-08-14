import { CounterModel } from '../models/counter.model'

const COUNTER_NAME = 'assessment_attempt'
const SEQUENCE_PAD_LENGTH = 6

/** `DM-ATT-{year}-{6-digit sequence}` — same atomic-counter design as every other `*-id.service.ts`. */
export async function generateAttemptCode(): Promise<string> {
  const counter = await CounterModel.findOneAndUpdate(
    { _id: COUNTER_NAME },
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  )

  const year = new Date().getFullYear()
  const sequence = counter.seq.toString().padStart(SEQUENCE_PAD_LENGTH, '0')
  return `DM-ATT-${String(year)}-${sequence}`
}
