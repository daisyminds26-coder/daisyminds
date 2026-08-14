import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { app } from '../../src/app'
import { createPublishedCourseFixture } from '../helpers/batch-fixtures'
import {
  bearer,
  createLiveClassFixture,
  createLoggedInTrainer,
  createScheduledBatchFixture,
} from '../helpers/live-class-fixtures'
import { createEnrollment, createLoggedInStudent } from '../helpers/student-portal-fixtures'
import { setupTestDatabase } from '../setup-db'

setupTestDatabase()

async function setupOwnedSession() {
  const owner = await createLoggedInTrainer()
  const stranger = await createLoggedInTrainer()
  const course = await createPublishedCourseFixture()
  const batch = await createScheduledBatchFixture(course._id.toString())
  const session = await createLiveClassFixture(batch._id.toString(), course._id.toString(), {
    status: 'SCHEDULED',
    trainerIds: [owner.trainerId],
    primaryTrainerId: owner.trainerId,
  })
  return { owner, stranger, course, batch, session }
}

describe('Trainer self-service Live Classes — ownership scoping', () => {
  it('a trainer can view their own assigned session, but a session assigned to another trainer 404s', async () => {
    const { owner, stranger, session } = await setupOwnedSession()

    const ownView = await request(app)
      .get(`/api/v1/trainer/live-classes/${session._id.toString()}`)
      .set(bearer(owner))
    expect(ownView.status).toBe(200)
    expect(ownView.body.data.hostUrl).toBeTruthy() // a trainer, unlike a student, does receive the host link

    const strangerView = await request(app)
      .get(`/api/v1/trainer/live-classes/${session._id.toString()}`)
      .set(bearer(stranger))
    expect(strangerView.status).toBe(404)
  })

  it('only the assigned trainer can start/complete their own session — another trainer is denied (404)', async () => {
    const { owner, stranger, session } = await setupOwnedSession()
    const id = session._id.toString()

    const strangerStart = await request(app)
      .post(`/api/v1/trainer/live-classes/${id}/start`)
      .set(bearer(stranger))
    expect(strangerStart.status).toBe(404)

    const ownStart = await request(app)
      .post(`/api/v1/trainer/live-classes/${id}/start`)
      .set(bearer(owner))
    expect(ownStart.status).toBe(200)
    expect(ownStart.body.data.status).toBe('LIVE')

    const ownComplete = await request(app)
      .post(`/api/v1/trainer/live-classes/${id}/complete`)
      .set(bearer(owner))
    expect(ownComplete.status).toBe(200)
    expect(ownComplete.body.data.status).toBe('COMPLETED')
  })

  it('only the assigned trainer can mark attendance for their own session — another trainer is denied (404)', async () => {
    const { owner, stranger, course, batch, session } = await setupOwnedSession()
    const student = await createLoggedInStudent()
    await createEnrollment(student.studentId, course._id.toString(), batch._id.toString(), {
      status: 'ACTIVE',
    })
    const id = session._id.toString()
    const body = { records: [{ studentId: student.studentId, status: 'PRESENT' }] }

    const strangerMark = await request(app)
      .patch(`/api/v1/trainer/live-classes/${id}/attendance`)
      .set(bearer(stranger))
      .send(body)
    expect(strangerMark.status).toBe(404)

    const ownMark = await request(app)
      .patch(`/api/v1/trainer/live-classes/${id}/attendance`)
      .set(bearer(owner))
      .send(body)
    expect(ownMark.status).toBe(200)
    const roster = ownMark.body.data.roster.roster as { studentId: string; status: string }[]
    expect(roster.find((row) => row.studentId === student.studentId)?.status).toBe('PRESENT')
  })
})
