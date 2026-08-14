/**
 * Converts a wall-clock date+time in a specific IANA timezone to the
 * matching UTC instant — no timezone library dependency. Standard
 * "round-trip" technique: treat the wall-clock digits as if they were UTC
 * (a guess), format that guessed instant back out *in the target zone*,
 * and the difference between the guess and what it reads as in the zone
 * is exactly the zone's UTC offset at that moment (DST-correct, since
 * it's derived from a real instant, not a static offset table).
 */
export function zonedWallTimeToUtc(dateKey: string, time: string, timeZone: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)

  const guess = new Date(
    Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1, hour ?? 0, minute ?? 0, 0),
  )

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(guess)

  const get = (type: string): number => Number(parts.find((part) => part.type === type)?.value ?? 0)
  const readAsUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  )

  const offsetMs = guess.getTime() - readAsUtc
  return new Date(guess.getTime() + offsetMs)
}

/** Inverse of `zonedWallTimeToUtc` — reads a UTC instant back out as `"HH:mm"` wall-clock time in a target timezone (e.g. rendering a real live-class session's stored UTC `startDateTime` in its own batch timezone for schedule display). */
export function utcToWallTime(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(instant)
}

/** Minutes between two `"HH:mm"` times, wrapping past midnight if `end` is numerically before `start` (an overnight slot). */
export function minutesBetween(startTime: string, endTime: string): number {
  const [startHour, startMinute] = startTime.split(':').map(Number)
  const [endHour, endMinute] = endTime.split(':').map(Number)
  const startTotal = (startHour ?? 0) * 60 + (startMinute ?? 0)
  const endTotal = (endHour ?? 0) * 60 + (endMinute ?? 0)
  return endTotal >= startTotal ? endTotal - startTotal : 24 * 60 - startTotal + endTotal
}
