/**
 * Converts an HTML `datetime-local` input value (`"YYYY-MM-DDTHH:mm"`, no
 * timezone) into the matching UTC ISO instant, treating the entered
 * wall-clock time as being in `timeZone` (the session's own timezone —
 * never the admin's browser timezone, which may differ). Mirrors the
 * backend's `zoned-datetime.util.ts#zonedWallTimeToUtc` round-trip
 * technique exactly, so a session created here lands on the same instant
 * the backend would compute for an identical wall-clock time.
 */
export function zonedWallTimeToUtc(dateTimeLocal: string, timeZone: string): string {
  const [dateKey, time] = dateTimeLocal.split('T')
  const [year, month, day] = (dateKey ?? '').split('-').map(Number)
  const [hour, minute] = (time ?? '').split(':').map(Number)

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
  return new Date(guess.getTime() + offsetMs).toISOString()
}
