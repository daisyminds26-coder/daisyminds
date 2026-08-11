import type { DayOfWeek } from '../models/batch.model'

export interface TimeRange {
  dayOfWeek: DayOfWeek
  startTime: string
  endTime: string
}

/** `"HH:mm"` → minutes since midnight, for numeric comparison. Validator already guarantees the format, so no parse-failure branch is needed here. */
function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return (hours ?? 0) * 60 + (minutes ?? 0)
}

/** Two ranges overlap iff they share a day and their intervals intersect — a shared boundary (one ends exactly when the other starts) does not count as an overlap. */
export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  if (a.dayOfWeek !== b.dayOfWeek) return false
  return (
    toMinutes(a.startTime) < toMinutes(b.endTime) && toMinutes(b.startTime) < toMinutes(a.endTime)
  )
}

/** Every pairwise overlap within one slot list — used to reject a weekly-schedule submission with two overlapping slots on the same day (`batch.validator.ts`). */
export function findOverlappingSlotPairs(slots: readonly TimeRange[]): [number, number][] {
  const pairs: [number, number][] = []
  for (let i = 0; i < slots.length; i += 1) {
    for (let j = i + 1; j < slots.length; j += 1) {
      const a = slots[i]
      const b = slots[j]
      if (a && b && rangesOverlap(a, b)) pairs.push([i, j])
    }
  }
  return pairs
}

/** Any slot in `a` overlapping any slot in `b` — used for cross-batch trainer-conflict detection (`batch-conflict.service.ts`) and trainer-availability compatibility checks. */
export function anySlotsOverlap(a: readonly TimeRange[], b: readonly TimeRange[]): boolean {
  return a.some((slotA) => b.some((slotB) => rangesOverlap(slotA, slotB)))
}

/** Whether `inner` is fully contained within `outer` on the same day — used to check a batch's weekly slot falls entirely inside one of a trainer's declared availability windows. */
export function isFullyContained(inner: TimeRange, outer: TimeRange): boolean {
  if (inner.dayOfWeek !== outer.dayOfWeek) return false
  return (
    toMinutes(inner.startTime) >= toMinutes(outer.startTime) &&
    toMinutes(inner.endTime) <= toMinutes(outer.endTime)
  )
}
