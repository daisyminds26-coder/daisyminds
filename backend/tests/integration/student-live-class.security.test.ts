import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { app } from '../../src/app'
import { dateKeyInTimezone, dayOfWeekInTimezone } from '../../src/utils/schedule-occurrence.util'
import { zonedWallTimeToUtc } from '../../src/utils/zoned-datetime.util'
import { createPublishedCourseFixture } from '../helpers/batch-fixtures'
import { createLiveClassFixture, createScheduledBatchFixture } from '../helpers/live-class-fixtures'
import { bearer, createEnrollment, createLoggedInStudent } from '../helpers/student-portal-fixtures'
import { setupTestDatabase } from '../setup-db'

setupTestDatabase()

describe('Student Live Classes — entitlement, join window, cancelled visibility, schedule precedence', () => {
  it('a student sees an upcoming SCHEDULED session for their own batch, but cannot join far outside the window', async () => {
    const student = await createLoggedInStudent()
    const course = await createPublishedCourseFixture()
    const batch = await createScheduledBatchFixture(course._id.toString())
    await createEnrollment(student.studentId, course._id.toString(), batch._id.toString(), {
      status: 'ACTIVE',
    })
    const farFuture = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
    await createLiveClassFixture(batch._id.toString(), course._id.toString(), {
      status: 'SCHEDULED',
      startDateTime: farFuture,
      endDateTime: new Date(farFuture.getTime() + 2 * 60 * 60 * 1000),
      scheduledDate: farFuture,
    })

    const res = await request(app).get('/api/v1/student/live-classes').set(bearer(student))

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].canJoin).toBe(false)
  })

  it('denies join (403) when the join window has not opened yet, even for an entitled student', async () => {
    const student = await createLoggedInStudent()
    const course = await createPublishedCourseFixture()
    const batch = await createScheduledBatchFixture(course._id.toString())
    await createEnrollment(student.studentId, course._id.toString(), batch._id.toString(), {
      status: 'ACTIVE',
    })
    const farFuture = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
    const session = await createLiveClassFixture(batch._id.toString(), course._id.toString(), {
      status: 'SCHEDULED',
      startDateTime: farFuture,
      endDateTime: new Date(farFuture.getTime() + 2 * 60 * 60 * 1000),
      scheduledDate: farFuture,
    })

    const res = await request(app)
      .get(`/api/v1/student/live-classes/${session._id.toString()}/join`)
      .set(bearer(student))

    expect(res.status).toBe(403)
  })

  it('returns join details once the session is LIVE and within the join window', async () => {
    const student = await createLoggedInStudent()
    const course = await createPublishedCourseFixture()
    const batch = await createScheduledBatchFixture(course._id.toString())
    await createEnrollment(student.studentId, course._id.toString(), batch._id.toString(), {
      status: 'ACTIVE',
    })
    const startDateTime = new Date(Date.now() - 5 * 60 * 1000)
    const endDateTime = new Date(Date.now() + 55 * 60 * 1000)
    const session = await createLiveClassFixture(batch._id.toString(), course._id.toString(), {
      status: 'LIVE',
      startDateTime,
      endDateTime,
      scheduledDate: startDateTime,
      joinUrl: 'https://meet.example.com/live-now',
    })

    const res = await request(app)
      .get(`/api/v1/student/live-classes/${session._id.toString()}/join`)
      .set(bearer(student))

    expect(res.status).toBe(200)
    expect(res.body.data.joinUrl).toBe('https://meet.example.com/live-now')
    expect(res.body.data.hostUrl).toBeUndefined() // never expose the host link to a student
  })

  it('hides a session (404) from a student who has no access-granting enrollment for that batch/course', async () => {
    const outsider = await createLoggedInStudent()
    const course = await createPublishedCourseFixture()
    const batch = await createScheduledBatchFixture(course._id.toString())
    const session = await createLiveClassFixture(batch._id.toString(), course._id.toString(), {
      status: 'SCHEDULED',
    })

    const res = await request(app)
      .get(`/api/v1/student/live-classes/${session._id.toString()}`)
      .set(bearer(outsider))

    expect(res.status).toBe(404)
  })

  it('shows a cancelled session in the list with a clear cancelled status and no join', async () => {
    const student = await createLoggedInStudent()
    const course = await createPublishedCourseFixture()
    const batch = await createScheduledBatchFixture(course._id.toString())
    await createEnrollment(student.studentId, course._id.toString(), batch._id.toString(), {
      status: 'ACTIVE',
    })
    const soon = new Date(Date.now() + 60 * 60 * 1000)
    await createLiveClassFixture(batch._id.toString(), course._id.toString(), {
      status: 'CANCELLED',
      startDateTime: soon,
      endDateTime: new Date(soon.getTime() + 60 * 60 * 1000),
      scheduledDate: soon,
      cancelledAt: new Date(),
      cancellationReason: 'Trainer unavailable',
    })

    const res = await request(app).get('/api/v1/student/live-classes').set(bearer(student))

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].status).toBe('CANCELLED')
    expect(res.body.data[0].canJoin).toBe(false)
  })

  it('a real live-class session takes precedence over — and suppresses — the derived timetable occurrence for the same batch+date', async () => {
    const tz = 'Asia/Kolkata'
    const student = await createLoggedInStudent()
    const course = await createPublishedCourseFixture()
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const dateKey = dateKeyInTimezone(tomorrow, tz)
    const dayOfWeek = dayOfWeekInTimezone(tomorrow, tz)

    const batch = await createScheduledBatchFixture(course._id.toString(), {
      timezone: tz,
      startDate: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
      weeklySchedule: [{ dayOfWeek, startTime: '10:00', endTime: '11:00' }],
    })
    await createEnrollment(student.studentId, course._id.toString(), batch._id.toString(), {
      status: 'ACTIVE',
    })

    const startDateTime = zonedWallTimeToUtc(dateKey, '10:00', tz)
    const endDateTime = zonedWallTimeToUtc(dateKey, '11:00', tz)
    await createLiveClassFixture(batch._id.toString(), course._id.toString(), {
      title: 'Real Special Session',
      startDateTime,
      endDateTime,
      scheduledDate: startDateTime,
      timezone: tz,
      status: 'SCHEDULED',
    })

    const res = await request(app).get('/api/v1/student/schedule').set(bearer(student))

    expect(res.status).toBe(200)
    const entriesForDate = (
      res.body.data as { date: string; sessionLabel: string | null }[]
    ).filter((entry) => entry.date === dateKey)
    expect(entriesForDate).toHaveLength(1)
    expect(entriesForDate[0]?.sessionLabel).toBe('Real Special Session')
  })
})
