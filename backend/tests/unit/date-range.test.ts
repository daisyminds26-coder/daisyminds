import { describe, expect, it } from 'vitest'

import { InvalidDashboardRangeError, resolveDashboardPeriod } from '../../src/utils/date-range'

const NOW = new Date('2026-03-15T10:30:00.000Z')

describe('resolveDashboardPeriod', () => {
  it('TODAY resolves to the start of the current day in the given timezone through now', () => {
    const period = resolveDashboardPeriod({ range: 'TODAY', timezone: 'Asia/Kolkata', now: NOW })
    expect(period.endDate).toEqual(NOW)
    // 2026-03-15T10:30Z is 2026-03-15T16:00 IST, so start-of-day IST is 2026-03-14T18:30:00Z.
    expect(period.startDate.toISOString()).toBe('2026-03-14T18:30:00.000Z')
  })

  it('LAST_7_DAYS starts 6 days before the start of today', () => {
    const today = resolveDashboardPeriod({ range: 'TODAY', timezone: 'UTC', now: NOW })
    const last7 = resolveDashboardPeriod({ range: 'LAST_7_DAYS', timezone: 'UTC', now: NOW })
    expect(today.startDate.getTime() - last7.startDate.getTime()).toBe(6 * 24 * 60 * 60 * 1000)
  })

  it('LAST_30_DAYS starts further back than LAST_7_DAYS', () => {
    const last7 = resolveDashboardPeriod({ range: 'LAST_7_DAYS', timezone: 'UTC', now: NOW })
    const last30 = resolveDashboardPeriod({ range: 'LAST_30_DAYS', timezone: 'UTC', now: NOW })
    expect(last30.startDate.getTime()).toBeLessThan(last7.startDate.getTime())
  })

  it('THIS_MONTH starts on the 1st of the current month at 00:00 in the given timezone', () => {
    const period = resolveDashboardPeriod({ range: 'THIS_MONTH', timezone: 'UTC', now: NOW })
    expect(period.startDate.toISOString()).toBe('2026-03-01T00:00:00.000Z')
  })

  it('THIS_YEAR starts on January 1st at 00:00 in the given timezone', () => {
    const period = resolveDashboardPeriod({ range: 'THIS_YEAR', timezone: 'UTC', now: NOW })
    expect(period.startDate.toISOString()).toBe('2026-01-01T00:00:00.000Z')
  })

  it('CUSTOM uses the exact given instants', () => {
    const startDate = new Date('2026-01-01T00:00:00.000Z')
    const endDate = new Date('2026-01-15T00:00:00.000Z')
    const period = resolveDashboardPeriod({
      range: 'CUSTOM',
      startDate,
      endDate,
      timezone: 'UTC',
      now: NOW,
    })
    expect(period.startDate).toEqual(startDate)
    expect(period.endDate).toEqual(endDate)
  })

  it('CUSTOM without startDate/endDate throws', () => {
    expect(() => resolveDashboardPeriod({ range: 'CUSTOM', timezone: 'UTC', now: NOW })).toThrow(
      InvalidDashboardRangeError,
    )
  })

  it('CUSTOM with endDate before startDate throws', () => {
    expect(() =>
      resolveDashboardPeriod({
        range: 'CUSTOM',
        startDate: new Date('2026-02-01T00:00:00.000Z'),
        endDate: new Date('2026-01-01T00:00:00.000Z'),
        timezone: 'UTC',
        now: NOW,
      }),
    ).toThrow(InvalidDashboardRangeError)
  })

  it('CUSTOM spanning more than 366 days throws', () => {
    expect(() =>
      resolveDashboardPeriod({
        range: 'CUSTOM',
        startDate: new Date('2020-01-01T00:00:00.000Z'),
        endDate: new Date('2026-01-01T00:00:00.000Z'),
        timezone: 'UTC',
        now: NOW,
      }),
    ).toThrow(InvalidDashboardRangeError)
  })
})
