import { http, HttpResponse } from 'msw'

import { TEST_API_BASE_URL } from '@/test/api-base-url'
import type { AdminCourse, AdminCourseListItem } from '@/features/courses/types'

/** Mirrors `backend/src/services/course-management.service.ts`'s DTO shapes for the endpoints the frontend actually calls. */

let courses: AdminCourse[] = []
let idCounter = 0

function seedDefaultCourses(): void {
  idCounter = 0
  courses = [
    makeCourse({
      title: 'Full Stack Web Development',
      category: 'Web Development',
      status: 'PUBLISHED',
    }),
    makeCourse({
      title: 'Data Science Bootcamp',
      category: 'Data Science',
      status: 'DRAFT',
    }),
  ]
}

function makeCourse(
  overrides: Partial<AdminCourse> & Pick<AdminCourse, 'title' | 'category'>,
): AdminCourse {
  idCounter += 1
  const now = new Date().toISOString()
  return {
    id: `course-${idCounter.toString()}`,
    courseCode: `DM-CRS-2026-${idCounter.toString().padStart(6, '0')}`,
    shortTitle: null,
    slug: overrides.title.toLowerCase().replace(/\s+/g, '-'),
    shortDescription: '',
    description: 'A comprehensive course.',
    subcategory: null,
    level: 'BEGINNER',
    language: 'en',
    secondaryLanguages: [],
    tags: [],
    durationValue: 12,
    durationUnit: 'WEEKS',
    deliveryMode: 'ONLINE',
    learningOutcomes: ['Build a full-stack web application'],
    skills: ['React', 'Node.js'],
    prerequisites: [],
    targetAudience: null,
    eligibilityCriteria: null,
    certificateEnabled: true,
    maxStudentCapacity: null,
    pricing: {
      pricingType: 'FREE',
      currency: 'INR',
      basePrice: 0,
      discountPrice: null,
      displayPrice: 0,
      taxInclusive: false,
      saleStartsAt: null,
      saleEndsAt: null,
    },
    visibility: 'PUBLIC',
    status: overrides.status ?? 'DRAFT',
    isFeatured: false,
    featuredOrder: null,
    metaTitle: null,
    metaDescription: null,
    canonicalUrl: null,
    thumbnailUrl: null,
    thumbnailPublicId: null,
    bannerUrl: null,
    bannerPublicId: null,
    eligibleTrainerIds: [],
    internalNotes: null,
    isDeleted: false,
    publishedAt: overrides.status === 'PUBLISHED' ? now : null,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function toListItem(course: AdminCourse): AdminCourseListItem {
  return {
    id: course.id,
    courseCode: course.courseCode,
    title: course.title,
    slug: course.slug,
    category: course.category,
    level: course.level,
    deliveryMode: course.deliveryMode,
    pricing: course.pricing,
    status: course.status,
    visibility: course.visibility,
    isFeatured: course.isFeatured,
    certificateEnabled: course.certificateEnabled,
    thumbnailUrl: course.thumbnailUrl,
    isDeleted: course.isDeleted,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
    publishedAt: course.publishedAt,
  }
}

export function resetCoursesMockState(): void {
  seedDefaultCourses()
}

/** Cross-handler accessor (`lesson-content.handlers.ts`'s launch-readiness mock) — reuses this module's own course-metadata-readiness rule rather than duplicating it. */
export function findCourseById(courseId: string): AdminCourse | undefined {
  return courses.find((course) => course.id === courseId)
}

seedDefaultCourses()

function successEnvelope<T>(data: T, message = 'Request completed successfully') {
  return { success: true, message, data, requestId: 'test-request-id' }
}

function paginatedEnvelope<T>(data: T[], page: number, limit: number, total: number) {
  return {
    success: true,
    message: 'Request completed successfully',
    data,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    requestId: 'test-request-id',
  }
}

function errorEnvelope(
  message: string,
  code: string,
  errors?: { field: string; message: string }[],
) {
  return { success: false, message, code, errors, requestId: 'test-request-id' }
}

export const coursesHandlers = [
  http.get(`${TEST_API_BASE_URL}/courses`, ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? '1')
    const limit = Number(url.searchParams.get('limit') ?? '20')
    const search = url.searchParams.get('search')
    const status = url.searchParams.get('status')

    let filtered = courses
    if (search) {
      filtered = filtered.filter((course) =>
        course.title.toLowerCase().includes(search.toLowerCase()),
      )
    }
    if (status) filtered = filtered.filter((course) => course.status === status)

    const start = (page - 1) * limit
    const pageItems = filtered.slice(start, start + limit).map(toListItem)
    return HttpResponse.json(paginatedEnvelope(pageItems, page, limit, filtered.length))
  }),

  http.post(`${TEST_API_BASE_URL}/courses`, async ({ request }) => {
    const body = (await request.json()) as { title: string; category: string }
    const created = makeCourse({ title: body.title, category: body.category, status: 'DRAFT' })
    courses.push(created)
    return HttpResponse.json(successEnvelope(created, 'Course created'), { status: 201 })
  }),

  // Order matters: `/bulk/:action` must be registered before the `/:id` param
  // routes below, or MSW will match `/courses/bulk/archive` as `id="bulk"`
  // against `/courses/:id/archive` — mirrors course.routes.ts on the backend.
  http.post(`${TEST_API_BASE_URL}/courses/bulk/:action`, async ({ request, params }) => {
    const body = (await request.json()) as { action: string; courseIds: string[] }
    const succeeded: string[] = []
    const failed: { id: string; reason: string }[] = []

    for (const id of body.courseIds) {
      const course = courses.find((candidate) => candidate.id === id)
      if (!course) {
        failed.push({ id, reason: 'Course not found' })
        continue
      }
      if (params.action === 'publish') course.status = 'PUBLISHED'
      else if (params.action === 'archive') course.status = 'ARCHIVED'
      else if (params.action === 'restore') course.isDeleted = false
      else course.isDeleted = true
      succeeded.push(id)
    }

    return HttpResponse.json(successEnvelope({ succeeded, failed }, 'Bulk action completed'))
  }),

  http.get(`${TEST_API_BASE_URL}/courses/:id`, ({ params }) => {
    const course = courses.find((candidate) => candidate.id === params.id)
    if (!course) {
      return HttpResponse.json(errorEnvelope('Course not found', 'NOT_FOUND'), { status: 404 })
    }
    return HttpResponse.json(successEnvelope(course))
  }),

  http.patch(`${TEST_API_BASE_URL}/courses/:id`, async ({ params, request }) => {
    const course = courses.find((candidate) => candidate.id === params.id)
    if (!course) {
      return HttpResponse.json(errorEnvelope('Course not found', 'NOT_FOUND'), { status: 404 })
    }
    const body = (await request.json()) as Partial<AdminCourse>
    Object.assign(course, body)
    return HttpResponse.json(successEnvelope(course, 'Course updated'))
  }),

  http.post(`${TEST_API_BASE_URL}/courses/:id/readiness-check`, ({ params }) => {
    const course = courses.find((candidate) => candidate.id === params.id)
    if (!course) {
      return HttpResponse.json(errorEnvelope('Course not found', 'NOT_FOUND'), { status: 404 })
    }
    const blockers = course.thumbnailUrl
      ? []
      : [{ field: 'thumbnailUrl', message: 'A thumbnail image is required to publish' }]
    return HttpResponse.json(successEnvelope({ ready: blockers.length === 0, blockers }))
  }),

  http.post(`${TEST_API_BASE_URL}/courses/:id/publish`, ({ params }) => {
    const course = courses.find((candidate) => candidate.id === params.id)
    if (!course) {
      return HttpResponse.json(errorEnvelope('Course not found', 'NOT_FOUND'), { status: 404 })
    }
    if (!course.thumbnailUrl) {
      return HttpResponse.json(
        errorEnvelope('Course is not ready to publish', 'UNPROCESSABLE_ENTITY', [
          { field: 'thumbnailUrl', message: 'A thumbnail image is required to publish' },
        ]),
        { status: 422 },
      )
    }
    course.status = 'PUBLISHED'
    course.publishedAt = new Date().toISOString()
    return HttpResponse.json(successEnvelope(course, 'Course published'))
  }),

  http.post(`${TEST_API_BASE_URL}/courses/:id/unpublish`, ({ params }) => {
    const course = courses.find((candidate) => candidate.id === params.id)
    if (!course) {
      return HttpResponse.json(errorEnvelope('Course not found', 'NOT_FOUND'), { status: 404 })
    }
    course.status = 'DRAFT'
    return HttpResponse.json(successEnvelope(course, 'Course moved back to draft'))
  }),

  http.post(`${TEST_API_BASE_URL}/courses/:id/archive`, ({ params }) => {
    const course = courses.find((candidate) => candidate.id === params.id)
    if (!course) {
      return HttpResponse.json(errorEnvelope('Course not found', 'NOT_FOUND'), { status: 404 })
    }
    course.status = 'ARCHIVED'
    course.archivedAt = new Date().toISOString()
    return HttpResponse.json(successEnvelope(course, 'Course archived'))
  }),

  http.post(`${TEST_API_BASE_URL}/courses/:id/restore`, ({ params }) => {
    const course = courses.find((candidate) => candidate.id === params.id)
    if (!course) {
      return HttpResponse.json(errorEnvelope('Course not found', 'NOT_FOUND'), { status: 404 })
    }
    if (course.isDeleted) {
      course.isDeleted = false
    } else {
      course.status = 'DRAFT'
      course.archivedAt = null
    }
    return HttpResponse.json(successEnvelope(course, 'Course restored'))
  }),

  http.delete(`${TEST_API_BASE_URL}/courses/:id`, ({ params }) => {
    const course = courses.find((candidate) => candidate.id === params.id)
    if (!course) {
      return HttpResponse.json(errorEnvelope('Course not found', 'NOT_FOUND'), { status: 404 })
    }
    course.isDeleted = true
    return HttpResponse.json(successEnvelope(null, 'Course deleted'))
  }),

  http.get(`${TEST_API_BASE_URL}/courses/:id/audit`, () =>
    HttpResponse.json(paginatedEnvelope([], 1, 20, 0)),
  ),

  http.post(`${TEST_API_BASE_URL}/courses/:id/thumbnail/signature`, ({ params }) =>
    HttpResponse.json(
      successEnvelope({
        timestamp: Date.now(),
        signature: 'fake-signature',
        apiKey: 'fake-key',
        cloudName: 'demo',
        folder: `daisy-minds/courses/${String(params.id)}/thumbnail`,
        publicId: `daisy-minds/courses/${String(params.id)}/thumbnail/thumb-1`,
        allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
        maxFileSize: 5 * 1024 * 1024,
      }),
    ),
  ),

  http.post(`${TEST_API_BASE_URL}/courses/:id/thumbnail/verify`, ({ params }) => {
    const course = courses.find((candidate) => candidate.id === params.id)
    if (!course) {
      return HttpResponse.json(errorEnvelope('Course not found', 'NOT_FOUND'), { status: 404 })
    }
    course.thumbnailUrl = 'https://res.cloudinary.com/demo/image/upload/thumb.jpg'
    course.thumbnailPublicId = `daisy-minds/courses/${String(params.id)}/thumbnail/thumb-1`
    return HttpResponse.json(successEnvelope(course, 'Thumbnail updated'))
  }),

  http.delete(`${TEST_API_BASE_URL}/courses/:id/thumbnail`, ({ params }) => {
    const course = courses.find((candidate) => candidate.id === params.id)
    if (!course) {
      return HttpResponse.json(errorEnvelope('Course not found', 'NOT_FOUND'), { status: 404 })
    }
    course.thumbnailUrl = null
    course.thumbnailPublicId = null
    return HttpResponse.json(successEnvelope(course, 'Thumbnail removed'))
  }),

  http.post(`${TEST_API_BASE_URL}/courses/:id/banner/signature`, ({ params }) =>
    HttpResponse.json(
      successEnvelope({
        timestamp: Date.now(),
        signature: 'fake-signature',
        apiKey: 'fake-key',
        cloudName: 'demo',
        folder: `daisy-minds/courses/${String(params.id)}/banner`,
        publicId: `daisy-minds/courses/${String(params.id)}/banner/banner-1`,
        allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
        maxFileSize: 5 * 1024 * 1024,
      }),
    ),
  ),

  http.post(`${TEST_API_BASE_URL}/courses/:id/banner/verify`, ({ params }) => {
    const course = courses.find((candidate) => candidate.id === params.id)
    if (!course) {
      return HttpResponse.json(errorEnvelope('Course not found', 'NOT_FOUND'), { status: 404 })
    }
    course.bannerUrl = 'https://res.cloudinary.com/demo/image/upload/banner.jpg'
    course.bannerPublicId = `daisy-minds/courses/${String(params.id)}/banner/banner-1`
    return HttpResponse.json(successEnvelope(course, 'Banner updated'))
  }),

  http.delete(`${TEST_API_BASE_URL}/courses/:id/banner`, ({ params }) => {
    const course = courses.find((candidate) => candidate.id === params.id)
    if (!course) {
      return HttpResponse.json(errorEnvelope('Course not found', 'NOT_FOUND'), { status: 404 })
    }
    course.bannerUrl = null
    course.bannerPublicId = null
    return HttpResponse.json(successEnvelope(course, 'Banner removed'))
  }),
]
