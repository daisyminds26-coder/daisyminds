import type {
  BatchDeliveryMode,
  DayOfWeek,
  ICalendarException,
  IWeeklyScheduleSlot,
} from '../models/batch.model'
import { DAYS_OF_WEEK } from '../models/batch.model'

const FALLBACK_DAY: DayOfWeek = 'SUNDAY'

export interface ScheduleOccurrence {
  date: string
  dayOfWeek: DayOfWeek
  startTime: string
  endTime: string
  sessionLabel: string | null
  deliveryMode: BatchDeliveryMode
}

/**
 * `"yyyy-mm-dd"` for a `Date`, as read in a specific IANA timezone — no
 * library needed, `Intl` already carries full ICU data. Exported so callers
 * outside this file (e.g. the student schedule builder, to key real
 * live-class sessions against derived occurrences for the same calendar
 * date) can compute the identical date key rather than re-implementing it.
 */
export function dateKeyInTimezone(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(date)
}

export function dayOfWeekInTimezone(date: Date, timezone: string): DayOfWeek {
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'long' })
    .format(date)
    .toUpperCase()
  const match = DAYS_OF_WEEK.find((day) => day === weekday)
  return match ?? FALLBACK_DAY
}

/**
 * Derived-only "what classes are coming up" view (student Schedule tab) —
 * generates concrete calendar occurrences from a batch's recurring
 * `weeklySchedule` template, skipping `calendarExceptions` and anything
 * outside `[startDate, endDate]`. Never persisted, never a live-class
 * record — purely a read-time projection. No existing admin equivalent to
 * reuse (verified — batch-conflict/readiness services only compare
 * day+time overlaps, never generate calendar dates).
 */
export function generateUpcomingOccurrences(params: {
  weeklySchedule: IWeeklyScheduleSlot[]
  calendarExceptions: ICalendarException[]
  startDate: Date | null
  endDate: Date | null
  deliveryMode: BatchDeliveryMode
  timezone: string
  from: Date
  daysAhead: number
  maxOccurrences: number
}): ScheduleOccurrence[] {
  const { weeklySchedule, calendarExceptions, startDate, endDate, deliveryMode, timezone } = params
  if (weeklySchedule.length === 0) return []

  const exceptionDateKeys = new Set(
    calendarExceptions.map((exception) => dateKeyInTimezone(exception.date, timezone)),
  )
  const startKey = startDate ? dateKeyInTimezone(startDate, timezone) : null
  const endKey = endDate ? dateKeyInTimezone(endDate, timezone) : null

  const occurrences: ScheduleOccurrence[] = []

  for (let offset = 0; offset <= params.daysAhead; offset += 1) {
    const candidate = new Date(params.from.getTime() + offset * 86_400_000)
    const candidateKey = dateKeyInTimezone(candidate, timezone)

    if (startKey && candidateKey < startKey) continue
    if (endKey && candidateKey > endKey) continue
    if (exceptionDateKeys.has(candidateKey)) continue

    const candidateDay = dayOfWeekInTimezone(candidate, timezone)
    const slots = weeklySchedule.filter((slot) => slot.dayOfWeek === candidateDay)

    for (const slot of slots) {
      occurrences.push({
        date: candidateKey,
        dayOfWeek: candidateDay,
        startTime: slot.startTime,
        endTime: slot.endTime,
        sessionLabel: slot.sessionLabel,
        deliveryMode: slot.deliveryModeOverride ?? deliveryMode,
      })
    }

    if (occurrences.length >= params.maxOccurrences) break
  }

  return occurrences
    .sort((a, b) =>
      a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date),
    )
    .slice(0, params.maxOccurrences)
}
