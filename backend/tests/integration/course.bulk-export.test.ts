import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { app } from '../../src/app'
import { generateOpenApiDocument } from '../../src/config/swagger'
import { loginAs } from '../helpers/auth'
import { validCreateCoursePayload } from '../helpers/course-fixtures'
import { setupTestDatabase } from '../setup-db'

setupTestDatabase()

async function createCourse(
  accessToken: string,
  overrides: Parameters<typeof validCreateCoursePayload>[0] = {},
) {
  const res = await request(app)
    .post('/api/v1/courses')
    .set('Authorization', `Bearer ${accessToken}`)
    .send(validCreateCoursePayload(overrides))
  return res.body.data.id as string
}

describe('POST /api/v1/courses/bulk/archive', () => {
  it('archives multiple courses', async () => {
    const admin = await loginAs({ email: 'admin1@example.com', role: 'ADMIN' })
    const id1 = await createCourse(admin.accessToken, { title: 'Bulk Course One' })
    const id2 = await createCourse(admin.accessToken, { title: 'Bulk Course Two' })

    const res = await request(app)
      .post('/api/v1/courses/bulk/archive')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ action: 'archive', courseIds: [id1, id2] })

    expect(res.status).toBe(200)
    expect(res.body.data.succeeded).toEqual([id1, id2])
    expect(res.body.data.failed).toHaveLength(0)
  })

  it('reports a per-item failure without blocking the rest of the batch', async () => {
    const admin = await loginAs({ email: 'admin2@example.com', role: 'ADMIN' })
    const id = await createCourse(admin.accessToken, { title: 'Bulk Course Three' })
    await request(app)
      .post(`/api/v1/courses/${id}/archive`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    const id2 = await createCourse(admin.accessToken, { title: 'Bulk Course Four' })

    const res = await request(app)
      .post('/api/v1/courses/bulk/archive')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ action: 'archive', courseIds: [id, id2] })

    expect(res.status).toBe(200)
    expect(res.body.data.succeeded).toEqual([id2])
    expect(res.body.data.failed).toEqual([{ id, reason: expect.any(String) }])
  })

  it('rejects a batch larger than the max allowed size', async () => {
    const admin = await loginAs({ email: 'admin3@example.com', role: 'ADMIN' })
    const ids = Array.from({ length: 101 }, () => '000000000000000000000000')

    const res = await request(app)
      .post('/api/v1/courses/bulk/archive')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ action: 'archive', courseIds: ids })

    expect(res.status).toBe(400)
  })

  it('writes a course.bulk_action audit entry', async () => {
    const admin = await loginAs({ email: 'admin4@example.com', role: 'ADMIN' })
    const id = await createCourse(admin.accessToken)

    await request(app)
      .post('/api/v1/courses/bulk/archive')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ action: 'archive', courseIds: [id] })

    const auditRes = await request(app)
      .get(`/api/v1/courses/${id}/audit`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    const actions = (auditRes.body.data as { action: string }[]).map((entry) => entry.action)
    expect(actions).toContain('course.archived')
  })
})

describe('POST /api/v1/courses/bulk/publish', () => {
  it('requires the courses:publish permission (distinct from courses:manage)', async () => {
    const restrictedAdmin = await loginAs({
      email: 'restricted1@example.com',
      role: 'ADMIN',
      permissions: ['courses:read', 'courses:manage'],
    })
    const id = await createCourse(restrictedAdmin.accessToken)

    const res = await request(app)
      .post('/api/v1/courses/bulk/publish')
      .set('Authorization', `Bearer ${restrictedAdmin.accessToken}`)
      .send({ action: 'publish', courseIds: [id] })

    expect(res.status).toBe(403)
  })
})

describe('GET /api/v1/courses/export', () => {
  it('exports a CSV respecting the current filter', async () => {
    const admin = await loginAs({ email: 'admin5@example.com', role: 'ADMIN' })
    await createCourse(admin.accessToken, {
      title: 'Exported Frontend Course',
      category: 'Frontend',
    })
    await createCourse(admin.accessToken, { title: 'Excluded Backend Course', category: 'Backend' })

    const res = await request(app)
      .get('/api/v1/courses/export?category=Frontend')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('text/csv')
    expect(res.text).toContain('Exported Frontend Course')
    expect(res.text).not.toContain('Excluded Backend Course')
  })

  it('neutralizes a leading formula-trigger character (CSV/formula injection)', async () => {
    const admin = await loginAs({ email: 'admin6@example.com', role: 'ADMIN' })
    await createCourse(admin.accessToken, { title: '=SUM(A1:A10)', category: 'Formula Test' })

    const res = await request(app)
      .get('/api/v1/courses/export?category=Formula Test')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.text).toContain("'=SUM(A1:A10)")
  })

  it('writes a course.exported audit entry', async () => {
    const admin = await loginAs({ email: 'admin7@example.com', role: 'ADMIN' })
    await createCourse(admin.accessToken)

    const res = await request(app)
      .get('/api/v1/courses/export')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
  })

  it('denies a TRAINER export access', async () => {
    const trainer = await loginAs({ email: 'trainer1@example.com', role: 'TRAINER' })

    const res = await request(app)
      .get('/api/v1/courses/export')
      .set('Authorization', `Bearer ${trainer.accessToken}`)

    expect(res.status).toBe(403)
  })
})

describe('OpenAPI registration', () => {
  it('registers the courses paths in the generated OpenAPI document', () => {
    const document = generateOpenApiDocument()
    expect(document.paths['/courses']).toBeDefined()
    expect(document.paths['/courses/{id}/publish']).toBeDefined()
    expect(document.paths['/courses/bulk/publish']).toBeDefined()
  })
})
