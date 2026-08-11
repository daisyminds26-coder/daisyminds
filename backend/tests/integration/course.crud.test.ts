import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { app } from '../../src/app'
import { CourseModel } from '../../src/models/course.model'
import { loginAs } from '../helpers/auth'
import { validCreateCoursePayload } from '../helpers/course-fixtures'
import { setupTestDatabase } from '../setup-db'

setupTestDatabase()

describe('POST /api/v1/courses', () => {
  it('creates a course as DRAFT with a generated course code and slug', async () => {
    const admin = await loginAs({ email: 'admin1@example.com', role: 'ADMIN' })

    const res = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateCoursePayload({ title: 'Full Stack Web Development' }))

    expect(res.status).toBe(201)
    expect(res.body.data.status).toBe('DRAFT')
    expect(res.body.data.courseCode).toMatch(/^DM-CRS-\d{4}-\d{6}$/)
    expect(res.body.data.slug).toBe('full-stack-web-development')
  })

  it('generates unique, incrementing course codes under concurrent creation', async () => {
    const admin = await loginAs({ email: 'admin2@example.com', role: 'ADMIN' })

    const responses = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post('/api/v1/courses')
          .set('Authorization', `Bearer ${admin.accessToken}`)
          .send(validCreateCoursePayload({ title: `Concurrent Course ${String(i)}` })),
      ),
    )

    const codes = responses.map((res) => res.body.data.courseCode as string)
    expect(new Set(codes).size).toBe(5)
  })

  it('auto-dedupes a slug collision with a numeric suffix', async () => {
    const admin = await loginAs({ email: 'admin3@example.com', role: 'ADMIN' })

    const first = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateCoursePayload({ title: 'Data Science Bootcamp' }))
    const second = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateCoursePayload({ title: 'Data Science Bootcamp' }))

    expect(first.body.data.slug).toBe('data-science-bootcamp')
    expect(second.body.data.slug).toBe('data-science-bootcamp-2')
  })

  it('rejects a TRAINER (no course-management access this phase)', async () => {
    const trainer = await loginAs({ email: 'trainer1@example.com', role: 'TRAINER' })

    const res = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${trainer.accessToken}`)
      .send(validCreateCoursePayload())

    expect(res.status).toBe(403)
  })

  it('rejects a STUDENT', async () => {
    const student = await loginAs({ email: 'student1@example.com', role: 'STUDENT' })

    const res = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${student.accessToken}`)
      .send(validCreateCoursePayload())

    expect(res.status).toBe(403)
  })

  it('rejects an unauthenticated request', async () => {
    const res = await request(app).post('/api/v1/courses').send(validCreateCoursePayload())
    expect(res.status).toBe(401)
  })

  it('rejects mass-assignment of status/courseCode/audit fields', async () => {
    const admin = await loginAs({ email: 'admin4@example.com', role: 'ADMIN' })

    const res = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        ...validCreateCoursePayload(),
        status: 'PUBLISHED',
        courseCode: 'DM-CRS-2020-000001',
        createdBy: '000000000000000000000000',
      })

    expect(res.status).toBe(400)
  })

  it('rejects a paid course with no base price', async () => {
    const admin = await loginAs({ email: 'admin5@example.com', role: 'ADMIN' })

    const res = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateCoursePayload({ pricing: { pricingType: 'PAID', basePrice: 0 } }))

    expect(res.status).toBe(400)
  })

  it('rejects a discount price greater than or equal to the base price', async () => {
    const admin = await loginAs({ email: 'admin6@example.com', role: 'ADMIN' })

    const res = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(
        validCreateCoursePayload({
          pricing: { pricingType: 'PAID', basePrice: 100, discountPrice: 150 },
        }),
      )

    expect(res.status).toBe(400)
  })

  it('normalizes a FREE course to clear any submitted paid-pricing fields', async () => {
    const admin = await loginAs({ email: 'admin7@example.com', role: 'ADMIN' })

    const res = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(
        validCreateCoursePayload({
          pricing: {
            pricingType: 'FREE',
            basePrice: 999,
            discountPrice: 100,
            saleStartsAt: new Date('2026-01-01').toISOString(),
            saleEndsAt: new Date('2026-02-01').toISOString(),
          } as never,
        }),
      )

    expect(res.status).toBe(201)
    expect(res.body.data.pricing.basePrice).toBe(0)
    expect(res.body.data.pricing.discountPrice).toBeNull()
    expect(res.body.data.pricing.saleStartsAt).toBeNull()
  })

  it('rejects a sale end date before the sale start date', async () => {
    const admin = await loginAs({ email: 'admin8@example.com', role: 'ADMIN' })

    const res = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(
        validCreateCoursePayload({
          pricing: {
            pricingType: 'PAID',
            basePrice: 100,
            saleStartsAt: new Date('2026-02-01').toISOString(),
            saleEndsAt: new Date('2026-01-01').toISOString(),
          } as never,
        }),
      )

    expect(res.status).toBe(400)
  })

  it('rejects an eligible trainer id that does not exist', async () => {
    const admin = await loginAs({ email: 'admin9@example.com', role: 'ADMIN' })

    const res = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateCoursePayload({ eligibleTrainerIds: ['000000000000000000000000'] }))

    expect(res.status).toBe(400)
  })

  it('rejects a learning outcome exceeding the max length', async () => {
    const admin = await loginAs({ email: 'admin10@example.com', role: 'ADMIN' })

    const res = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateCoursePayload({ learningOutcomes: ['x'.repeat(301)] }))

    expect(res.status).toBe(400)
  })

  it('rejects a meta title exceeding the SEO length limit', async () => {
    const admin = await loginAs({ email: 'admin11@example.com', role: 'ADMIN' })

    const res = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateCoursePayload({ metaTitle: 'x'.repeat(71) }))

    expect(res.status).toBe(400)
  })

  it('rejects durationValue without durationUnit', async () => {
    const admin = await loginAs({ email: 'admin12@example.com', role: 'ADMIN' })

    const res = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateCoursePayload({ durationValue: 10 }))

    expect(res.status).toBe(400)
  })
})

describe('GET /api/v1/courses', () => {
  async function seedCourses(accessToken: string) {
    await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(
        validCreateCoursePayload({
          title: 'React for Beginners',
          category: 'Frontend',
          level: 'BEGINNER',
          pricing: { pricingType: 'FREE' },
        }),
      )
    await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(
        validCreateCoursePayload({
          title: 'Advanced Kubernetes',
          category: 'DevOps',
          level: 'ADVANCED',
          pricing: { pricingType: 'PAID', basePrice: 4999 },
        }),
      )
  }

  it('lists courses with pagination meta', async () => {
    const admin = await loginAs({ email: 'admin13@example.com', role: 'ADMIN' })
    await seedCourses(admin.accessToken)

    const res = await request(app)
      .get('/api/v1/courses?limit=1')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.meta.total).toBe(2)
    expect(res.body.meta.totalPages).toBe(2)
  })

  it('searches by title', async () => {
    const admin = await loginAs({ email: 'admin14@example.com', role: 'ADMIN' })
    await seedCourses(admin.accessToken)

    const res = await request(app)
      .get('/api/v1/courses?search=Kubernetes')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].title).toBe('Advanced Kubernetes')
  })

  it('filters by category', async () => {
    const admin = await loginAs({ email: 'admin15@example.com', role: 'ADMIN' })
    await seedCourses(admin.accessToken)

    const res = await request(app)
      .get('/api/v1/courses?category=DevOps')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].category).toBe('DevOps')
  })

  it('filters by pricingType', async () => {
    const admin = await loginAs({ email: 'admin16@example.com', role: 'ADMIN' })
    await seedCourses(admin.accessToken)

    const res = await request(app)
      .get('/api/v1/courses?pricingType=PAID')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].pricing.pricingType).toBe('PAID')
  })

  it('rejects an invalid sort field', async () => {
    const admin = await loginAs({ email: 'admin17@example.com', role: 'ADMIN' })

    const res = await request(app)
      .get('/api/v1/courses?sort=notAField:asc')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(400)
  })

  it('caps the page size at the maximum allowed limit', async () => {
    const admin = await loginAs({ email: 'admin18@example.com', role: 'ADMIN' })

    const res = await request(app)
      .get('/api/v1/courses?limit=1000')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(400)
  })

  it('excludes soft-deleted courses by default', async () => {
    const admin = await loginAs({ email: 'admin19@example.com', role: 'ADMIN' })
    const created = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateCoursePayload({ title: 'Soon Deleted Course' }))
    await request(app)
      .delete(`/api/v1/courses/${String(created.body.data.id)}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    const res = await request(app)
      .get('/api/v1/courses?search=Soon Deleted Course')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.body.data).toHaveLength(0)
  })

  it('denies a TRAINER read access (no permission this phase)', async () => {
    const trainer = await loginAs({ email: 'trainer2@example.com', role: 'TRAINER' })

    const res = await request(app)
      .get('/api/v1/courses')
      .set('Authorization', `Bearer ${trainer.accessToken}`)

    expect(res.status).toBe(403)
  })
})

describe('GET /api/v1/courses/:id', () => {
  it('returns 404 for a non-existent course', async () => {
    const admin = await loginAs({ email: 'admin20@example.com', role: 'ADMIN' })

    const res = await request(app)
      .get('/api/v1/courses/000000000000000000000000')
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(404)
  })

  it('returns 404 for a soft-deleted course (never leaks it via direct id lookup)', async () => {
    const admin = await loginAs({ email: 'admin21@example.com', role: 'ADMIN' })
    const created = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateCoursePayload())
    await request(app)
      .delete(`/api/v1/courses/${String(created.body.data.id)}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    const res = await request(app)
      .get(`/api/v1/courses/${String(created.body.data.id)}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.status).toBe(404)
  })

  it('never leaks a raw Mongoose document (no internal bookkeeping fields)', async () => {
    const admin = await loginAs({ email: 'admin22@example.com', role: 'ADMIN' })
    const created = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateCoursePayload())

    const res = await request(app)
      .get(`/api/v1/courses/${String(created.body.data.id)}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    expect(res.body.data.$__).toBeUndefined()
    expect(res.body.data._doc).toBeUndefined()
  })
})

describe('PATCH /api/v1/courses/:id', () => {
  it('updates allowed fields', async () => {
    const admin = await loginAs({ email: 'admin23@example.com', role: 'ADMIN' })
    const created = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateCoursePayload())

    const res = await request(app)
      .patch(`/api/v1/courses/${String(created.body.data.id)}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ title: 'Updated Course Title', category: 'Updated Category' })

    expect(res.status).toBe(200)
    expect(res.body.data.title).toBe('Updated Course Title')
  })

  it('rejects an attempt to change the immutable courseCode', async () => {
    const admin = await loginAs({ email: 'admin24@example.com', role: 'ADMIN' })
    const created = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateCoursePayload())

    const res = await request(app)
      .patch(`/api/v1/courses/${String(created.body.data.id)}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ courseCode: 'DM-CRS-2020-999999' })

    expect(res.status).toBe(400)

    const course = await CourseModel.findById(created.body.data.id)
    expect(course?.courseCode).toBe(created.body.data.courseCode)
  })

  it('records a course.pricing_changed audit entry when pricing is updated', async () => {
    const admin = await loginAs({ email: 'admin25@example.com', role: 'ADMIN' })
    const created = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(validCreateCoursePayload())

    await request(app)
      .patch(`/api/v1/courses/${String(created.body.data.id)}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ pricing: { pricingType: 'PAID', basePrice: 999 } })

    const auditRes = await request(app)
      .get(`/api/v1/courses/${String(created.body.data.id)}/audit`)
      .set('Authorization', `Bearer ${admin.accessToken}`)

    const actions = (auditRes.body.data as { action: string }[]).map((entry) => entry.action)
    expect(actions).toContain('course.pricing_changed')
  })
})
