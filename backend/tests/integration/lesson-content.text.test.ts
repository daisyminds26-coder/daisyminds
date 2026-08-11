import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { app } from '../../src/app'
import { loginAs } from '../helpers/auth'
import { contentPath, setupLessonForType } from '../helpers/lesson-content-fixtures'
import { setupTestDatabase } from '../setup-db'

setupTestDatabase()

describe('Lesson content — text', () => {
  it('starts EMPTY with no textContent', async () => {
    const fixture = await setupLessonForType('lct1@example.com', 'TEXT')

    const res = await request(app)
      .get(contentPath(fixture))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.contentStatus).toBe('EMPTY')
    expect(res.body.data.textContent).toBeNull()
  })

  it('sets and sanitizes text content, becoming READY', async () => {
    const fixture = await setupLessonForType('lct2@example.com', 'TEXT')

    const res = await request(app)
      .put(contentPath(fixture, '/text'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
      .send({
        textContent:
          '<p onclick="alert(1)">Hello <script>alert(2)</script><b>world</b></p><a href="javascript:alert(3)">bad</a>',
      })

    expect(res.status).toBe(200)
    expect(res.body.data.contentStatus).toBe('READY')
    expect(res.body.data.textContent).not.toContain('<script>')
    expect(res.body.data.textContent).not.toContain('onclick')
    expect(res.body.data.textContent).not.toContain('javascript:')
    expect(res.body.data.textContent).toContain('<b>world</b>')
  })

  it('treats a blank rich-text payload (e.g. an empty <p>) as INCOMPLETE, not READY', async () => {
    const fixture = await setupLessonForType('lct3@example.com', 'TEXT')

    const res = await request(app)
      .put(contentPath(fixture, '/text'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
      .send({ textContent: '<p></p>' })

    expect(res.status).toBe(200)
    expect(res.body.data.contentStatus).toBe('INCOMPLETE')
  })

  it('rejects setting text content on a non-TEXT lesson', async () => {
    const fixture = await setupLessonForType('lct4@example.com', 'VIDEO')

    const res = await request(app)
      .put(contentPath(fixture, '/text'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
      .send({ textContent: '<p>hi</p>' })

    expect(res.status).toBe(409)
  })

  it('rejects an unauthenticated request', async () => {
    const fixture = await setupLessonForType('lct5@example.com', 'TEXT')

    const res = await request(app)
      .put(contentPath(fixture, '/text'))
      .send({ textContent: '<p>hi</p>' })

    expect(res.status).toBe(401)
  })

  it('rejects a STUDENT (no courses:manage permission)', async () => {
    const fixture = await setupLessonForType('lct6@example.com', 'TEXT')
    const student = await loginAs({ email: 'lct6-student@example.com', role: 'STUDENT' })

    const res = await request(app)
      .put(contentPath(fixture, '/text'))
      .set('Authorization', `Bearer ${student.accessToken}`)
      .send({ textContent: '<p>hi</p>' })

    expect(res.status).toBe(403)
  })

  it('allows a STUDENT-forbidden but READ-permitted GET (courses:read only) — TRAINER can read', async () => {
    const fixture = await setupLessonForType('lct7@example.com', 'TEXT')
    const trainer = await loginAs({
      email: 'lct7-trainer@example.com',
      role: 'TRAINER',
      permissions: ['courses:read'],
    })

    const res = await request(app)
      .get(contentPath(fixture))
      .set('Authorization', `Bearer ${trainer.accessToken}`)

    expect(res.status).toBe(200)
  })

  it('blocks content edits while the course is archived', async () => {
    const fixture = await setupLessonForType('lct8@example.com', 'TEXT')
    await request(app)
      .post(`/api/v1/courses/${fixture.courseId}/archive`)
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)

    const res = await request(app)
      .put(contentPath(fixture, '/text'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
      .send({ textContent: '<p>hi</p>' })

    expect(res.status).toBe(409)
  })

  it('records a lesson.content.text_updated audit event without the raw content in metadata', async () => {
    const fixture = await setupLessonForType('lct9@example.com', 'TEXT')

    await request(app)
      .put(contentPath(fixture, '/text'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
      .send({ textContent: '<p>secret lesson body</p>' })

    const auditRes = await request(app)
      .get(`/api/v1/courses/${fixture.courseId}/audit`)
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)

    const entries = auditRes.body.data as { action: string }[]
    expect(entries.some((entry) => entry.action === 'lesson.content.text_updated')).toBe(true)
    expect(JSON.stringify(entries)).not.toContain('secret lesson body')
  })

  it('runs the content readiness-check endpoint and reports blockers when EMPTY', async () => {
    const fixture = await setupLessonForType('lct10@example.com', 'TEXT')

    const res = await request(app)
      .post(contentPath(fixture, '/readiness-check'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.ready).toBe(false)
    expect(res.body.data.blockers.length).toBeGreaterThan(0)
  })
})
