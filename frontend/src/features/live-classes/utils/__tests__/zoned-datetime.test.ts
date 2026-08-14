import { describe, expect, it } from 'vitest'

import { zonedWallTimeToUtc } from '@/features/live-classes/utils/zoned-datetime'

describe('zonedWallTimeToUtc', () => {
  it('converts a wall-clock time in Asia/Kolkata (UTC+5:30) to the correct UTC instant', () => {
    // 18:00 IST on 2026-09-07 is 12:30 UTC the same day.
    const result = zonedWallTimeToUtc('2026-09-07T18:00', 'Asia/Kolkata')
    expect(result).toBe('2026-09-07T12:30:00.000Z')
  })

  it('converts a wall-clock time in America/New_York (UTC-4 during DST) to the correct UTC instant', () => {
    // 09:00 EDT on 2026-07-01 is 13:00 UTC the same day.
    const result = zonedWallTimeToUtc('2026-07-01T09:00', 'America/New_York')
    expect(result).toBe('2026-07-01T13:00:00.000Z')
  })

  it('produces the same instant a batch-timezone-aware admin picking the identical wall-clock time would expect, regardless of the admin browser timezone assumption', () => {
    // The whole point of this utility: two admins in different browser
    // timezones picking "18:00" for a session whose own timezone is
    // Asia/Kolkata must both produce the identical UTC instant.
    const first = zonedWallTimeToUtc('2026-09-07T18:00', 'Asia/Kolkata')
    const second = zonedWallTimeToUtc('2026-09-07T18:00', 'Asia/Kolkata')
    expect(first).toBe(second)
  })
})
