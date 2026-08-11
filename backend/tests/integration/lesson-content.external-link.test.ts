import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { app } from '../../src/app'
import { contentPath, setupLessonForType } from '../helpers/lesson-content-fixtures'
import { setupTestDatabase } from '../setup-db'

setupTestDatabase()

describe('Lesson content — external link', () => {
  it('sets a valid https link, becoming READY, with a parsed domain', async () => {
    const fixture = await setupLessonForType('lcl1@example.com', 'EXTERNAL_LINK')

    const res = await request(app)
      .put(contentPath(fixture, '/external-link'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
      .send({ url: 'https://example.com/resource', label: 'External resource' })

    expect(res.status).toBe(200)
    expect(res.body.data.contentStatus).toBe('READY')
    expect(res.body.data.externalLink.domain).toBe('example.com')
    expect(res.body.data.externalLink.openInNewTab).toBe(true)
  })

  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'file:///etc/passwd',
    'ftp://example.com/file',
  ])('rejects the %s scheme', async (url, index) => {
    const fixture = await setupLessonForType(`lcl-scheme-${index}@example.com`, 'EXTERNAL_LINK')

    const res = await request(app)
      .put(contentPath(fixture, '/external-link'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
      .send({ url })

    expect(res.status).toBe(400)
  })

  it('rejects a malformed URL', async () => {
    const fixture = await setupLessonForType('lcl2@example.com', 'EXTERNAL_LINK')

    const res = await request(app)
      .put(contentPath(fixture, '/external-link'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
      .send({ url: 'not a url' })

    expect(res.status).toBe(400)
  })

  it('rejects setting a link on a non-EXTERNAL_LINK lesson', async () => {
    const fixture = await setupLessonForType('lcl3@example.com', 'TEXT')

    const res = await request(app)
      .put(contentPath(fixture, '/external-link'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
      .send({ url: 'https://example.com' })

    expect(res.status).toBe(409)
  })

  it('honors openInNewTab: false', async () => {
    const fixture = await setupLessonForType('lcl4@example.com', 'EXTERNAL_LINK')

    const res = await request(app)
      .put(contentPath(fixture, '/external-link'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
      .send({ url: 'https://example.com', openInNewTab: false })

    expect(res.status).toBe(200)
    expect(res.body.data.externalLink.openInNewTab).toBe(false)
  })

  it('allows http (not just https) for local/dev content sources', async () => {
    const fixture = await setupLessonForType('lcl5@example.com', 'EXTERNAL_LINK')

    const res = await request(app)
      .put(contentPath(fixture, '/external-link'))
      .set('Authorization', `Bearer ${fixture.admin.accessToken}`)
      .send({ url: 'http://example.com' })

    expect(res.status).toBe(200)
  })

  it('rejects an unauthenticated request', async () => {
    const fixture = await setupLessonForType('lcl6@example.com', 'EXTERNAL_LINK')

    const res = await request(app)
      .put(contentPath(fixture, '/external-link'))
      .send({ url: 'https://example.com' })

    expect(res.status).toBe(401)
  })
})
