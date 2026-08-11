import type { WeeklyScheduleSlot } from '@/features/batches/types'

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return (hours ?? 0) * 60 + (minutes ?? 0)
}

/** Total weekly teaching minutes across all slots — single source of truth shared by the Overview summary and the Schedule tab's timetable view. */
export function computeWeeklyTeachingMinutes(weeklySchedule: WeeklyScheduleSlot[]): number {
  return weeklySchedule.reduce(
    (sum, slot) => sum + Math.max(0, toMinutes(slot.endTime) - toMinutes(slot.startTime)),
    0,
  )
}
