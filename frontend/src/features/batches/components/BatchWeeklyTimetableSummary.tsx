import { CalendarClock } from 'lucide-react'

import { EmptyState } from '@/shared/components/feedback/empty-state'
import { computeWeeklyTeachingMinutes } from '@/features/batches/utils/schedule-stats'
import { DAYS_OF_WEEK, type WeeklyScheduleSlot } from '@/features/batches/types'

const DAY_LABELS: Record<string, string> = {
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
  SATURDAY: 'Saturday',
  SUNDAY: 'Sunday',
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return (hours ?? 0) * 60 + (minutes ?? 0)
}

function formatTime(time: string): string {
  const [hoursRaw, minutesRaw] = time.split(':').map(Number)
  const hours = hoursRaw ?? 0
  const minutes = minutesRaw ?? 0
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours % 12 === 0 ? 12 : hours % 12
  return `${displayHour.toString()}:${minutes.toString().padStart(2, '0')} ${period}`
}

/** Read-only weekly timetable summary — the batch's own timezone, never UTC-converted, matching `WeeklyScheduleEditor`. */
export function BatchWeeklyTimetableSummary({
  weeklySchedule,
  timezone,
}: {
  weeklySchedule: WeeklyScheduleSlot[]
  timezone: string
}) {
  if (weeklySchedule.length === 0) {
    return <EmptyState icon={CalendarClock} title="No weekly timetable configured" />
  }

  const totalHours = Math.round((computeWeeklyTeachingMinutes(weeklySchedule) / 60) * 10) / 10

  const byDay = DAYS_OF_WEEK.map((day) => ({
    day,
    slots: weeklySchedule
      .filter((slot) => slot.dayOfWeek === day)
      .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime)),
  })).filter((entry) => entry.slots.length > 0)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {byDay.map(({ day, slots }) => (
          <div key={day} className="border-border rounded-lg border p-3">
            <p className="text-body-sm font-medium">{DAY_LABELS[day]}</p>
            {slots.map((slot, index) => (
              <p key={index} className="text-body-sm text-muted-foreground">
                {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                {slot.sessionLabel ? ` · ${slot.sessionLabel}` : ''}
              </p>
            ))}
          </div>
        ))}
      </div>
      <p className="text-caption text-muted-foreground">
        {totalHours} weekly teaching hour{totalHours === 1 ? '' : 's'} · {timezone}
      </p>
    </div>
  )
}
