import { CounterModel } from '../models/counter.model'

const COUNTER_NAME = 'assignment-submission'
const SEQUENCE_PAD_LENGTH = 6

/** `DM-SUB-{year}-{6-digit sequence}` — one code per **attempt**, same atomic-counter design as `assignment-id.service.ts`. */
export async function generateSubmissionCode(): Promise<string> {
  const counter = await CounterModel.findOneAndUpdate(
    { _id: COUNTER_NAME },
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  )

  const year = new Date().getFullYear()
  const sequence = counter.seq.toString().padStart(SEQUENCE_PAD_LENGTH, '0')
  return `DM-SUB-${String(year)}-${sequence}`
}
