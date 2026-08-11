export const DASHBOARD_RANGES = [
  'TODAY',
  'LAST_7_DAYS',
  'LAST_30_DAYS',
  'THIS_MONTH',
  'THIS_YEAR',
  'CUSTOM',
] as const
export type DashboardRange = (typeof DASHBOARD_RANGES)[number]

export interface ResolvedPeriod {
  range: DashboardRange
  startDate: Date
  endDate: Date
  timezone: string
}

const MS_PER_DAY = 24 * 60 * 60 * 1000
/**
 * A year plus a day of slack — generous enough for any legitimate "this year
 * so far" custom range, small enough to keep an aggregation bounded.
 * Exported so `dashboard.validator.ts` can enforce the exact same limit at
 * the Zod layer (a validation failure, HTTP 400) rather than only here
 * (which `resolveDashboardPeriod` also still enforces, as defense in depth
 * for any future non-HTTP caller — but an HTTP request that fails this
 * check should never reach the point of throwing a 500 from the service).
 */
export const MAX_CUSTOM_RANGE_MS = 366 * MS_PER_DAY

/**
 * The offset (in ms) that must be added to a UTC instant to get the
 * wall-clock time that instant represents in `timeZone`. Standard
 * `Intl.DateTimeFormat`-based technique — accurate at `date`, which is all a
 * dashboard period boundary needs (a DST transition falling exactly on a
 * period boundary is an acceptable, cosmetic edge case here, not a billing
 * ledger).
 */
function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)

  const map: Record<string, string> = {}
  for (const part of parts) {
    if (part.type !== 'literal') map[part.type] = part.value
  }

  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  )
  return asUtc - date.getTime()
}

/** The UTC instant corresponding to 00:00:00 on `date`'s calendar day, as observed in `timeZone`. */
function startOfDayInTimeZone(date: Date, timeZone: string): Date {
  const offsetMs = getTimeZoneOffsetMs(date, timeZone)
  const localMillis = date.getTime() + offsetMs
  const local = new Date(localMillis)
  local.setUTCHours(0, 0, 0, 0)
  return new Date(local.getTime() - offsetMs)
}

/** The UTC instant corresponding to the 1st of `date`'s calendar month at 00:00:00, as observed in `timeZone`. */
function startOfMonthInTimeZone(date: Date, timeZone: string): Date {
  const offsetMs = getTimeZoneOffsetMs(date, timeZone)
  const local = new Date(date.getTime() + offsetMs)
  local.setUTCDate(1)
  local.setUTCHours(0, 0, 0, 0)
  return new Date(local.getTime() - offsetMs)
}

/** The UTC instant corresponding to January 1st of `date`'s calendar year at 00:00:00, as observed in `timeZone`. */
function startOfYearInTimeZone(date: Date, timeZone: string): Date {
  const offsetMs = getTimeZoneOffsetMs(date, timeZone)
  const local = new Date(date.getTime() + offsetMs)
  local.setUTCMonth(0, 1)
  local.setUTCHours(0, 0, 0, 0)
  return new Date(local.getTime() - offsetMs)
}

export class InvalidDashboardRangeError extends Error {}

/**
 * Resolves the dashboard's `range`/`startDate`/`endDate`/`timezone` query
 * into a concrete `[startDate, endDate]` instant pair. Named ranges are
 * computed from the *current* moment using the requesting client's
 * calendar (never recomputed as a historical snapshot, per the phase spec —
 * "Today" always means today relative to `now`, not relative to some cached
 * `generatedAt`). `CUSTOM` uses the caller's exact instants, capped at
 * `MAX_CUSTOM_RANGE_MS` to keep the underlying aggregations bounded.
 */
export function resolveDashboardPeriod(input: {
  range: DashboardRange
  startDate?: Date
  endDate?: Date
  timezone: string
  now?: Date
}): ResolvedPeriod {
  const now = input.now ?? new Date()
  const { range, timezone } = input

  if (range === 'CUSTOM') {
    if (!input.startDate || !input.endDate) {
      throw new InvalidDashboardRangeError(
        'startDate and endDate are required when range is CUSTOM',
      )
    }
    if (input.startDate > input.endDate) {
      throw new InvalidDashboardRangeError('startDate must not be after endDate')
    }
    if (input.endDate.getTime() - input.startDate.getTime() > MAX_CUSTOM_RANGE_MS) {
      throw new InvalidDashboardRangeError('Custom date range cannot exceed 366 days')
    }
    return { range, startDate: input.startDate, endDate: input.endDate, timezone }
  }

  const startDate = (() => {
    switch (range) {
      case 'TODAY':
        return startOfDayInTimeZone(now, timezone)
      case 'LAST_7_DAYS':
        return startOfDayInTimeZone(new Date(now.getTime() - 6 * MS_PER_DAY), timezone)
      case 'LAST_30_DAYS':
        return startOfDayInTimeZone(new Date(now.getTime() - 29 * MS_PER_DAY), timezone)
      case 'THIS_MONTH':
        return startOfMonthInTimeZone(now, timezone)
      case 'THIS_YEAR':
        return startOfYearInTimeZone(now, timezone)
    }
  })()

  return { range, startDate, endDate: now, timezone }
}
