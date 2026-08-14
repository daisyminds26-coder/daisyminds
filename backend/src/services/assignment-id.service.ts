import { CounterModel } from '../models/counter.model'

const COUNTER_NAME = 'assignment'
const SEQUENCE_PAD_LENGTH = 6

/** `DM-ASG-{year}-{6-digit sequence}` — same atomic-counter design as `batch-id.service.ts`/`live-class-id.service.ts`. */
export async function generateAssignmentCode(): Promise<string> {
  const counter = await CounterModel.findOneAndUpdate(
    { _id: COUNTER_NAME },
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  )

  const year = new Date().getFullYear()
  const sequence = counter.seq.toString().padStart(SEQUENCE_PAD_LENGTH, '0')
  return `DM-ASG-${String(year)}-${sequence}`
}
