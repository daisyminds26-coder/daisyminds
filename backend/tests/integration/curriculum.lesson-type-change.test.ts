import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { app } from '../../src/app'
import { contentPath, setupLessonForType } from '../helpers/lesson-content-fixtures'
import { setupTestDatabase } from '../setup-db'

setupTestDatabase()

function lessonPath(fixture: Awaited<ReturnType<typeof setupLessonForType>>) {
  return `/api/v1/courses/${fixture.courseId}/modules/${fixture.moduleId}/lessons/${fixture.lessonId}`
}

describe('Curriculum — lesson type change vs. existing content', () => {
  it('allows changing lessonType freely when the lesson has no content yet', async () => {
    const fixture = await setupLessonForType('ltc1@example.com', 'TEXT')

    const res = await request(app)
      .patch(lessonPath(fixture))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
      .send({ lessonType: 'VIDEO' })

    expect(res.status).toBe(200)
    expect(res.body.data.lessonType).toBe('VIDEO')
  })

  it('rejects changing lessonType away from a lesson with existing content, without confirmation', async () => {
    const fixture = await setupLessonForType('ltc2@example.com', 'TEXT')
    await request(app)
      .put(contentPath(fixture, '/text'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
      .send({ textContent: '<p>Real content here</p>' })

    const res = await request(app)
      .patch(lessonPath(fixture))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
      .send({ lessonType: 'VIDEO' })

    expect(res.status).toBe(409)

    // Content must still be intact — the rejected request must not have mutated anything.
    const getRes = await request(app)
      .get(contentPath(fixture))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
    expect(getRes.body.data.lessonType).toBe('TEXT')
    expect(getRes.body.data.textContent).toContain('Real content here')
  })

  it('discards the old content and resets contentStatus when confirmContentReset is true', async () => {
    const fixture = await setupLessonForType('ltc3@example.com', 'TEXT')
    await request(app)
      .put(contentPath(fixture, '/text'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
      .send({ textContent: '<p>Real content here</p>' })

    const res = await request(app)
      .patch(lessonPath(fixture))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
      .send({ lessonType: 'EXTERNAL_LINK', confirmContentReset: true })

    expect(res.status).toBe(200)
    expect(res.body.data.lessonType).toBe('EXTERNAL_LINK')

    const getRes = await request(app)
      .get(contentPath(fixture))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
    expect(getRes.body.data.textContent).toBeNull()
    expect(getRes.body.data.contentStatus).toBe('EMPTY')
  })

  it('does not require confirmContentReset for a type change that leaves content untouched (e.g. title-only edits)', async () => {
    const fixture = await setupLessonForType('ltc4@example.com', 'TEXT')
    await request(app)
      .put(contentPath(fixture, '/text'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
      .send({ textContent: '<p>Real content here</p>' })

    const res = await request(app)
      .patch(lessonPath(fixture))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
      .send({ title: 'Renamed lesson' })

    expect(res.status).toBe(200)
    expect(res.body.data.title).toBe('Renamed lesson')
  })
})
