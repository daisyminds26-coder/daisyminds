import { useMemo } from 'react'
import { format, isSameDay } from 'date-fns'
import { CalendarDays, CalendarOff } from 'lucide-react'

import { EmptyState } from '@/shared/components/feedback/empty-state'
import type { CalendarException, WeeklyScheduleSlot } from '@/features/batches/types'

const DAY_INDEX: Record<string, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
}

const MAX_DAYS_SCANNED = 180
const MAX_OCCURRENCES_SHOWN = 15

interface Occurrence {
  date: Date
  isException: boolean
  exceptionTitle: string | null
}

/**
 * A lightweight, client-derived list of upcoming teaching/no-class dates —
 * not persisted anywhere, not Live Class Management (no session/class IDs,
 * no attendance, no meeting links). Purely a visual composition of the
 * batch's own date range + weekly schedule + calendar exceptions, capped to
 * avoid an unbounded scan for open-ended or very long batches.
 */
export function BatchCalendarView({
  startDate,
  endDate,
  weeklySchedule,
  calendarExceptions,
}: {
  startDate: string | null
  endDate: string | null
  weeklySchedule: WeeklyScheduleSlot[]
  calendarExceptions: CalendarException[]
}) {
  const occurrences = useMemo<Occurrence[]>(() => {
    if (!startDate || !endDate || weeklySchedule.length === 0) return []
    const teachingDayIndexes = new Set(
      weeklySchedule.map((slot) => DAY_INDEX[slot.dayOfWeek]).filter((n) => n !== undefined),
    )
    const start = new Date(startDate)
    const end = new Date(endDate)
    const results: Occurrence[] = []
    const cursor = new Date(start)
    let scanned = 0

    while (cursor <= end && scanned < MAX_DAYS_SCANNED) {
      if (teachingDayIndexes.has(cursor.getDay())) {
        const exception = calendarExceptions.find((exc) => isSameDay(new Date(exc.date), cursor))
        results.push({
          date: new Date(cursor),
          isException: Boolean(exception),
          exceptionTitle: exception?.title ?? null,
        })
      }
      cursor.setDate(cursor.getDate() + 1)
      scanned += 1
    }
    return results
  }, [startDate, endDate, weeklySchedule, calendarExceptions])

  if (!startDate || !endDate) {
    return <EmptyState icon={CalendarDays} title="Batch dates not set" />
  }
  if (weeklySchedule.length === 0) {
    return <EmptyState icon={CalendarDays} title="No weekly timetable configured" />
  }

  const visible = occurrences.slice(0, MAX_OCCURRENCES_SHOWN)
  const remaining = occurrences.length - visible.length

  return (
    <div className="flex flex-col gap-3">
      <p className="text-body-sm text-muted-foreground">
        {format(new Date(startDate), 'MMM d, yyyy')} – {format(new Date(endDate), 'MMM d, yyyy')}
      </p>
      {visible.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No sessions fall within this date range" />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {visible.map((occurrence) => (
            <li
              key={occurrence.date.toISOString()}
              className={
                occurrence.isException
                  ? 'border-border bg-muted/40 flex items-center gap-2 rounded-lg border p-2'
                  : 'border-border flex items-center gap-2 rounded-lg border p-2'
              }
            >
              {occurrence.isException ? (
                <CalendarOff
                  className="text-muted-foreground size-3.5 shrink-0"
                  aria-hidden="true"
                />
              ) : (
                <CalendarDays className="text-primary size-3.5 shrink-0" aria-hidden="true" />
              )}
              <span className="text-body-sm">{format(occurrence.date, 'EEE, MMM d, yyyy')}</span>
              {occurrence.isException && (
                <span className="text-caption text-muted-foreground">
                  No class{occurrence.exceptionTitle ? ` — ${occurrence.exceptionTitle}` : ''}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {remaining > 0 && (
        <p className="text-caption text-muted-foreground">+{remaining} more sessions</p>
      )}
    </div>
  )
}
