import { Schema, model, type HydratedDocument } from 'mongoose'

/**
 * Generic atomic-sequence collection — one document per named counter
 * (`_id` is the counter's name, e.g. `'student'`). `findOneAndUpdate` with
 * `$inc` is a single atomic operation in MongoDB, so concurrent callers can
 * never observe or claim the same `seq` value (unlike counting documents,
 * which races under concurrent inserts). Not audit-fielded on purpose — a
 * counter is infrastructure, not a business record.
 */
export interface ICounter {
  _id: string
  seq: number
}

export type CounterDocument = HydratedDocument<ICounter>

const counterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, required: true, default: 0 },
})

export const CounterModel = model<ICounter>('Counter', counterSchema, 'counters')
