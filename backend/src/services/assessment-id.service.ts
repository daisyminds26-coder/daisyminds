import { CounterModel } from '../models/counter.model'

const COUNTER_NAME = 'assessment'
const SEQUENCE_PAD_LENGTH = 6

/**
 * `DM-ASM-{year}-{6-digit sequence}` — one uniform code prefix for both
 * QUIZ and EXAM assessments, not a `DM-QUIZ-`/`DM-EXAM-` split. Documented
 * choice (task's own "evaluate consistency, document choice"): every other
 * `*-id.service.ts` in this codebase mints exactly one prefix per
 * *collection*, never branching on a document's own type field (e.g.
 * `batches` has one `DM-BAT-` prefix regardless of `deliveryMode`) — a
 * QUIZ/EXAM prefix split would be the first exception to that convention
 * for no functional benefit, since `assessmentType` already discriminates
 * the two in every query/filter/display context that needs it.
 */
export async function generateAssessmentCode(): Promise<string> {
  const counter = await CounterModel.findOneAndUpdate(
    { _id: COUNTER_NAME },
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  )

  const year = new Date().getFullYear()
  const sequence = counter.seq.toString().padStart(SEQUENCE_PAD_LENGTH, '0')
  return `DM-ASM-${String(year)}-${sequence}`
}
