import type { BatchDocument, IWeeklyScheduleSlot } from '../models/batch.model'
import { trainerRepository } from '../repositories/trainer.repository'
import { batchRepository } from '../repositories/batch.repository'
import { anySlotsOverlap, isFullyContained, type TimeRange } from '../utils/schedule-overlap.util'

export interface TrainerConflict {
  type: 'AVAILABILITY' | 'CROSS_BATCH'
  trainerId: string
  message: string
  conflictingBatchId?: string
  conflictingBatchCode?: string
}

function toTimeRanges(slots: readonly IWeeklyScheduleSlot[]): TimeRange[] {
  return slots.map((slot) => ({
    dayOfWeek: slot.dayOfWeek,
    startTime: slot.startTime,
    endTime: slot.endTime,
  }))
}

/** `null` on either side means "no constraint yet" (a DRAFT batch may have no dates) — in that case the ranges are treated as non-overlapping, since there is nothing concrete to conflict with. */
function dateRangesOverlap(
  aStart: Date | null,
  aEnd: Date | null,
  bStart: Date | null,
  bEnd: Date | null,
): boolean {
  if (!aStart || !aEnd || !bStart || !bEnd) return false
  return aStart <= bEnd && bStart <= aEnd
}

/**
 * "Detect weekly slot outside trainer availability" (task's own minimum
 * bar) — a batch slot is compatible only if it falls entirely inside a
 * trainer-declared `AVAILABLE`/`PREFERRED` window on the same day and does
 * not intersect any `BLOCKED` window. Comparison only happens when the
 * trainer's availability slot shares the batch's own timezone string
 * exactly — full cross-timezone wall-clock conversion is deliberately out
 * of scope this phase (task: "do NOT create a full cross-batch resource
 * scheduler yet"); a slot in a different timezone is silently skipped
 * rather than falsely flagged.
 */
async function checkAvailabilityCompatibility(
  trainerId: string,
  batchTimezone: string,
  weeklySchedule: readonly IWeeklyScheduleSlot[],
): Promise<TrainerConflict[]> {
  if (weeklySchedule.length === 0) return []

  const trainer = await trainerRepository.findById(trainerId)
  if (!trainer) return []

  const sameZoneAvailability = trainer.availability.filter(
    (slot) => slot.timeZone === batchTimezone,
  )
  const availableSlots = sameZoneAvailability.filter((slot) => slot.type !== 'BLOCKED')
  const blockedSlots = sameZoneAvailability.filter((slot) => slot.type === 'BLOCKED')

  const conflicts: TrainerConflict[] = []
  for (const batchSlot of weeklySchedule) {
    const range: TimeRange = {
      dayOfWeek: batchSlot.dayOfWeek,
      startTime: batchSlot.startTime,
      endTime: batchSlot.endTime,
    }

    const blockedHit = blockedSlots.some((slot) =>
      anySlotsOverlap(
        [range],
        [{ dayOfWeek: slot.dayOfWeek, startTime: slot.startTime, endTime: slot.endTime }],
      ),
    )
    if (blockedHit) {
      conflicts.push({
        type: 'AVAILABILITY',
        trainerId,
        message: `Trainer is unavailable on ${batchSlot.dayOfWeek} ${batchSlot.startTime}–${batchSlot.endTime}`,
      })
      continue
    }

    const contained = availableSlots.some((slot) =>
      isFullyContained(range, {
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
      }),
    )
    if (!contained && sameZoneAvailability.length > 0) {
      conflicts.push({
        type: 'AVAILABILITY',
        trainerId,
        message: `${batchSlot.dayOfWeek} ${batchSlot.startTime}–${batchSlot.endTime} is outside the trainer's declared availability`,
      })
    }
  }

  return conflicts
}

/**
 * Cross-batch double-booking — every other `SCHEDULED`/`ACTIVE` batch this
 * trainer is already assigned to (primary or assistant) whose date range
 * overlaps this batch's own, checked for a weekly-slot time overlap. This
 * is validation feedback, not a hard lock — two admins racing to assign the
 * same trainer to overlapping batches is a rare, low-stakes collision (no
 * data corruption results, just a schedule the trainer must sort out), so
 * no distributed lock is introduced for it (documented tradeoff).
 */
async function checkCrossBatchConflicts(
  trainerId: string,
  weeklySchedule: readonly IWeeklyScheduleSlot[],
  startDate: Date | null,
  endDate: Date | null,
  excludeBatchId?: string,
): Promise<TrainerConflict[]> {
  if (weeklySchedule.length === 0 || !startDate || !endDate) return []

  const candidates = await batchRepository.findOperationalBatchesForTrainer(
    trainerId,
    excludeBatchId,
  )
  const ourRanges = toTimeRanges(weeklySchedule)

  const conflicts: TrainerConflict[] = []
  for (const other of candidates) {
    if (!dateRangesOverlap(startDate, endDate, other.startDate, other.endDate)) continue
    if (!anySlotsOverlap(ourRanges, toTimeRanges(other.weeklySchedule))) continue

    conflicts.push({
      type: 'CROSS_BATCH',
      trainerId,
      message: `Trainer is already assigned to ${other.batchCode} during an overlapping time`,
      conflictingBatchId: other._id.toString(),
      conflictingBatchCode: other.batchCode,
    })
  }

  return conflicts
}

export const batchConflictService = {
  /** Every trainer conflict for a batch (primary + assistants), combining both availability and cross-batch checks — the single entry point both `batch-readiness.service.ts` and the dedicated `GET /:id/conflicts` endpoint call. */
  async checkConflicts(batch: BatchDocument): Promise<TrainerConflict[]> {
    const trainerIds = [
      ...(batch.primaryTrainerId ? [batch.primaryTrainerId.toString()] : []),
      ...batch.assistantTrainerIds.map((id) => id.toString()),
    ]
    if (trainerIds.length === 0) return []

    const results = await Promise.all(
      trainerIds.map(async (trainerId) => [
        ...(await checkAvailabilityCompatibility(trainerId, batch.timezone, batch.weeklySchedule)),
        ...(await checkCrossBatchConflicts(
          trainerId,
          batch.weeklySchedule,
          batch.startDate,
          batch.endDate,
          batch._id.toString(),
        )),
      ]),
    )

    return results.flat()
  },
}
