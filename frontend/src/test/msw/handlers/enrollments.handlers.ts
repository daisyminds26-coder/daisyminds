import { http, HttpResponse } from 'msw'

import { TEST_API_BASE_URL } from '@/test/api-base-url'
import { findBatchById, adjustBatchOccupiedSeats, setBatchWaitlistMock } from './batches.handlers'
import { findStudentById } from './students.handlers'
import { findCourseById } from './courses.handlers'
import type {
  AdminEnrollment,
  AdminEnrollmentListItem,
  AuditLogEntry,
  EnrollmentAccessState,
  EnrollmentStatus,
} from '@/features/enrollments/types'

/**
 * Mirrors `backend/src/services/enrollment-management.service.ts` /
 * `enrollment-capacity.service.ts` / `enrollment-access.service.ts` closely
 * enough for the frontend's own tests — a simplified stand-in for the
 * backend's real transactional capacity engine (Phase 10B Part 1), not a
 * reimplementation of it. Batch seat bookkeeping is delegated to
 * `batches.handlers.ts#adjustBatchOccupiedSeats`/`setBatchWaitlistMock` so
 * the two mocks never drift out of sync with each other.
 */

const SEAT_CONSUMING_STATUSES = new Set<EnrollmentStatus>(['CONFIRMED', 'ACTIVE', 'SUSPENDED'])

let enrollments: AdminEnrollment[] = []
let auditLog: Record<string, AuditLogEntry[]> = {}
let idCounter = 0

/** Ports `backend/src/services/enrollment-access.service.ts#computeEnrollmentAccessState` — kept deliberately identical so frontend tests exercise the same derived labels the real backend produces. */
function computeAccessState(enrollment: AdminEnrollment, now = new Date()): EnrollmentAccessState {
  if (enrollment.status === 'SUSPENDED') return 'SUSPENDED'
  if (enrollment.status === 'ACTIVE') {
    if (enrollment.accessStartsAt && new Date(enrollment.accessStartsAt) > now) {
      return 'NOT_YET_ACTIVE'
    }
    return 'ACTIVE'
  }
  if (enrollment.status === 'COMPLETED') {
    if (!enrollment.accessEndsAt) return 'LIFETIME'
    return new Date(enrollment.accessEndsAt) > now ? 'ACTIVE' : 'ENDED'
  }
  return 'NONE'
}

function pushAudit(enrollmentId: string, action: string): void {
  const entries = auditLog[enrollmentId] ?? []
  entries.unshift({
    id: `audit-${enrollmentId}-${(entries.length + 1).toString()}`,
    action,
    actorId: 'user-admin',
    actorRole: 'ADMIN',
    createdAt: new Date().toISOString(),
  })
  auditLog[enrollmentId] = entries
}

function makeEnrollment(
  overrides: Partial<AdminEnrollment> &
    Pick<AdminEnrollment, 'studentId' | 'batchId' | 'courseId' | 'status'>,
): AdminEnrollment {
  idCounter += 1
  const now = new Date().toISOString()
  return {
    id: `enrollment-${idCounter.toString()}`,
    enrollmentCode: `DM-ENR-2026-${idCounter.toString().padStart(6, '0')}`,
    // Always recomputed by `toDetailDto`/`toListItem` at read time — never read directly off the stored record.
    accessState: 'NONE',
    source: 'ADMIN',
    enrollmentDate: now,
    waitlistPosition: null,
    waitlistedAt: null,
    confirmedAt: null,
    activatedAt: null,
    suspendedAt: null,
    resumedAt: null,
    completedAt: null,
    cancelledAt: null,
    droppedAt: null,
    accessStartsAt: null,
    accessEndsAt: null,
    transferredFromEnrollmentId: null,
    transferredToEnrollmentId: null,
    transferReason: null,
    cancellationReason: null,
    dropReason: null,
    internalNotes: null,
    tags: [],
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function seedDefaultEnrollments(): void {
  idCounter = 0
  auditLog = {}

  const confirmed = makeEnrollment({
    studentId: 'student-1',
    batchId: 'batch-1',
    courseId: 'course-1',
    status: 'CONFIRMED',
    confirmedAt: new Date().toISOString(),
  })
  const active = makeEnrollment({
    studentId: 'student-2',
    batchId: 'batch-2',
    courseId: 'course-1',
    status: 'ACTIVE',
    confirmedAt: new Date().toISOString(),
    activatedAt: new Date().toISOString(),
    accessStartsAt: new Date().toISOString(),
  })

  const waitlisted = makeEnrollment({
    studentId: 'student-2',
    batchId: 'batch-1',
    courseId: 'course-1',
    status: 'WAITLISTED',
    waitlistPosition: 1,
    waitlistedAt: new Date().toISOString(),
  })

  enrollments = [confirmed, active, waitlisted]
  pushAudit(confirmed.id, 'enrollment.created')
  pushAudit(active.id, 'enrollment.created')
  pushAudit(active.id, 'enrollment.activated')
  pushAudit(waitlisted.id, 'enrollment.created')

  adjustBatchOccupiedSeats('batch-1', 1)
  adjustBatchOccupiedSeats('batch-2', 1)
  setBatchWaitlistMock('batch-1', [
    {
      id: waitlisted.id,
      enrollmentCode: waitlisted.enrollmentCode,
      studentId: waitlisted.studentId,
      studentCode: findStudentById(waitlisted.studentId)?.studentId ?? null,
      studentName: 'Rahul Verma',
      waitlistedAt: waitlisted.waitlistedAt,
      waitlistPosition: waitlisted.waitlistPosition,
    },
  ])
}

/**
 * Reseeds enrollment mock state. Must run *after* `resetBatchesMockState()`
 * in a test's `beforeEach` — seeding here bumps the freshly-reset batches'
 * `occupiedSeats` to stay consistent, so reversing the order would double
 * count across tests.
 */
export function resetEnrollmentsMockState(): void {
  seedDefaultEnrollments()
}

seedDefaultEnrollments()

export function findEnrollmentById(enrollmentId: string): AdminEnrollment | undefined {
  return enrollments.find((enrollment) => enrollment.id === enrollmentId)
}

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

function errorEnvelope(message: string, code: string) {
  return { success: false, message, code, requestId: 'test-request-id' }
}

function toListItem(enrollment: AdminEnrollment): AdminEnrollmentListItem {
  const student = findStudentById(enrollment.studentId)
  const batch = findBatchById(enrollment.batchId)
  const course = findCourseById(enrollment.courseId)

  return {
    id: enrollment.id,
    enrollmentCode: enrollment.enrollmentCode,
    status: enrollment.status,
    accessState: computeAccessState(enrollment),
    source: enrollment.source,
    enrollmentDate: enrollment.enrollmentDate,
    waitlistPosition: enrollment.waitlistPosition,
    activatedAt: enrollment.activatedAt,
    completedAt: enrollment.completedAt,
    createdAt: enrollment.createdAt,
    updatedAt: enrollment.updatedAt,
    student: student
      ? {
          id: student.id,
          studentCode: student.studentId,
          name: student.displayName ?? `${student.firstName} ${student.lastName}`,
          email: student.email,
        }
      : null,
    batch: batch
      ? { id: batch.id, batchCode: batch.batchCode, name: batch.name, status: batch.status }
      : null,
    course: course ? { id: course.id, courseCode: course.courseCode, title: course.title } : null,
  }
}

function toDetailDto(enrollment: AdminEnrollment): AdminEnrollment {
  return { ...enrollment, accessState: computeAccessState(enrollment) }
}

/** Releases a seat if the enrollment was in a seat-consuming status — mirrors `enrollment-lifecycle.util.ts#doesEnrollmentConsumeSeat`. */
function releaseSeatIfNeeded(enrollment: AdminEnrollment, fromStatus: EnrollmentStatus): void {
  if (SEAT_CONSUMING_STATUSES.has(fromStatus)) {
    adjustBatchOccupiedSeats(enrollment.batchId, -1)
  }
}

function removeFromWaitlist(enrollmentId: string, batchId: string): void {
  const batch = findBatchById(batchId)
  if (!batch) return
  // Waitlist entries live in `batches.handlers.ts`'s module state; re-derive
  // from the enrollments still WAITLISTED for this batch rather than reaching
  // into that module's private array directly.
  const remaining = enrollments
    .filter((e) => e.batchId === batchId && e.status === 'WAITLISTED' && e.id !== enrollmentId)
    .sort((a, b) => (a.waitlistPosition ?? 0) - (b.waitlistPosition ?? 0))
  remaining.forEach((entry, index) => {
    entry.waitlistPosition = index + 1
  })
  setBatchWaitlistMock(
    batchId,
    remaining.map((entry) => {
      const student = findStudentById(entry.studentId)
      return {
        id: entry.id,
        enrollmentCode: entry.enrollmentCode,
        studentId: entry.studentId,
        studentCode: student?.studentId ?? null,
        studentName: student
          ? (student.displayName ?? `${student.firstName} ${student.lastName}`)
          : 'Unknown',
        waitlistedAt: entry.waitlistedAt,
        waitlistPosition: entry.waitlistPosition,
      }
    }),
  )
}

function addToWaitlist(enrollment: AdminEnrollment): void {
  const position =
    enrollments.filter((e) => e.batchId === enrollment.batchId && e.status === 'WAITLISTED')
      .length + 1
  enrollment.status = 'WAITLISTED'
  enrollment.waitlistPosition = position
  enrollment.waitlistedAt = new Date().toISOString()

  const currentWaitlisted = enrollments.filter(
    (e) => e.batchId === enrollment.batchId && e.status === 'WAITLISTED',
  )
  setBatchWaitlistMock(
    enrollment.batchId,
    currentWaitlisted.map((entry) => {
      const student = findStudentById(entry.studentId)
      return {
        id: entry.id,
        enrollmentCode: entry.enrollmentCode,
        studentId: entry.studentId,
        studentCode: student?.studentId ?? null,
        studentName: student
          ? (student.displayName ?? `${student.firstName} ${student.lastName}`)
          : 'Unknown',
        waitlistedAt: entry.waitlistedAt,
        waitlistPosition: entry.waitlistPosition,
      }
    }),
  )
}

/** Reserves a seat if available, otherwise waitlists (when enabled) or rejects — mirrors `enrollment-capacity.service.ts#reserveSeatOrWaitlist`. */
function reserveSeatOrWaitlist(
  enrollment: AdminEnrollment,
): { ok: true } | { ok: false; message: string; code: string } {
  const batch = findBatchById(enrollment.batchId)
  if (!batch) return { ok: false, message: 'Batch not found', code: 'NOT_FOUND' }

  if (batch.availableSeats > 0) {
    enrollment.status = 'CONFIRMED'
    enrollment.confirmedAt = new Date().toISOString()
    adjustBatchOccupiedSeats(batch.id, 1)
    return { ok: true }
  }
  if (batch.waitlistEnabled) {
    addToWaitlist(enrollment)
    return { ok: true }
  }
  return {
    ok: false,
    message: 'This batch is full and does not accept a waitlist',
    code: 'CONFLICT',
  }
}

export const enrollmentsHandlers = [
  http.get(`${TEST_API_BASE_URL}/enrollments`, ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? '1')
    const limit = Number(url.searchParams.get('limit') ?? '20')
    const search = url.searchParams.get('search')
    const status = url.searchParams.get('status')
    const source = url.searchParams.get('source')
    const studentId = url.searchParams.get('studentId')
    const batchId = url.searchParams.get('batchId')
    const courseId = url.searchParams.get('courseId')
    const includeDeleted = url.searchParams.get('includeDeleted') === 'true'

    let filtered = includeDeleted ? enrollments : enrollments.filter((e) => !e.isDeleted)
    if (status) filtered = filtered.filter((e) => e.status === status)
    if (source) filtered = filtered.filter((e) => e.source === source)
    if (studentId) filtered = filtered.filter((e) => e.studentId === studentId)
    if (batchId) filtered = filtered.filter((e) => e.batchId === batchId)
    if (courseId) filtered = filtered.filter((e) => e.courseId === courseId)
    if (search) {
      const needle = search.toLowerCase()
      filtered = filtered.filter((e) => {
        const student = findStudentById(e.studentId)
        const batch = findBatchById(e.batchId)
        const matchesCode = e.enrollmentCode.toLowerCase().includes(needle)
        const matchesStudent = student
          ? `${student.firstName} ${student.lastName}`.toLowerCase().includes(needle)
          : false
        const matchesBatch = batch ? batch.name.toLowerCase().includes(needle) : false
        return matchesCode || matchesStudent || matchesBatch
      })
    }

    const sorted = [...filtered].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    const start = (page - 1) * limit
    const pageItems = sorted.slice(start, start + limit).map(toListItem)
    return HttpResponse.json(paginatedEnvelope(pageItems, page, limit, filtered.length))
  }),

  // Order matters: `/bulk/:action` and `/export` must be registered before
  // `/:id` below, or MSW matches them as `id="bulk"` / `id="export"` —
  // mirrors `batches.handlers.ts`'s identical note.
  http.post(`${TEST_API_BASE_URL}/enrollments/bulk/enroll`, async ({ request }) => {
    const body = (await request.json()) as { batchId: string; studentIds: string[] }
    const succeeded: string[] = []
    const waitlisted: string[] = []
    const failed: { id: string; reason: string }[] = []

    for (const studentId of body.studentIds) {
      const alreadyEnrolled = enrollments.some(
        (e) =>
          e.studentId === studentId &&
          e.batchId === body.batchId &&
          !['CANCELLED', 'DROPPED'].includes(e.status),
      )
      if (alreadyEnrolled) {
        failed.push({ id: studentId, reason: 'Student is already enrolled in this batch' })
        continue
      }
      const student = findStudentById(studentId)
      const batch = findBatchById(body.batchId)
      if (!student || !batch) {
        failed.push({ id: studentId, reason: 'Student or batch not found' })
        continue
      }
      const enrollment = makeEnrollment({
        studentId,
        batchId: body.batchId,
        courseId: batch.courseId,
        status: 'PENDING',
        source: 'BULK_IMPORT',
      })
      // Pushed before reservation so `reserveSeatOrWaitlist`'s waitlist-position
      // scan over the module `enrollments` array sees this entry too; rolled
      // back on failure to mirror the backend's atomic-transaction behavior.
      enrollments.push(enrollment)
      const result = reserveSeatOrWaitlist(enrollment)
      if (!result.ok) {
        enrollments.pop()
        failed.push({ id: studentId, reason: result.message })
        continue
      }
      pushAudit(enrollment.id, 'enrollment.created')
      if (enrollment.status === 'WAITLISTED') waitlisted.push(enrollment.id)
      else succeeded.push(enrollment.id)
    }

    return HttpResponse.json(
      successEnvelope({ succeeded, waitlisted, failed }, 'Bulk enrolment completed'),
    )
  }),

  http.post(`${TEST_API_BASE_URL}/enrollments/bulk/:action`, async ({ request, params }) => {
    const body = (await request.json()) as { enrollmentIds: string[] }
    const succeeded: string[] = []
    const waitlisted: string[] = []
    const failed: { id: string; reason: string }[] = []

    for (const id of body.enrollmentIds) {
      const enrollment = enrollments.find((e) => e.id === id)
      if (!enrollment) {
        failed.push({ id, reason: 'Enrollment not found' })
        continue
      }
      if (params.action === 'suspend') {
        if (enrollment.status !== 'ACTIVE') {
          failed.push({ id, reason: `Cannot suspend from ${enrollment.status}` })
          continue
        }
        enrollment.status = 'SUSPENDED'
        enrollment.suspendedAt = new Date().toISOString()
      } else if (params.action === 'resume') {
        if (enrollment.status !== 'SUSPENDED') {
          failed.push({ id, reason: `Cannot resume from ${enrollment.status}` })
          continue
        }
        enrollment.status = 'ACTIVE'
        enrollment.resumedAt = new Date().toISOString()
      } else if (params.action === 'cancel') {
        if (['COMPLETED', 'CANCELLED', 'DROPPED'].includes(enrollment.status)) {
          failed.push({ id, reason: `Cannot cancel from ${enrollment.status}` })
          continue
        }
        releaseSeatIfNeeded(enrollment, enrollment.status)
        if (enrollment.status === 'WAITLISTED')
          removeFromWaitlist(enrollment.id, enrollment.batchId)
        enrollment.status = 'CANCELLED'
        enrollment.cancelledAt = new Date().toISOString()
      } else {
        failed.push({ id, reason: 'Unsupported bulk action' })
        continue
      }
      pushAudit(enrollment.id, `enrollment.${params.action}`)
      succeeded.push(id)
    }

    return HttpResponse.json(
      successEnvelope({ succeeded, waitlisted, failed }, 'Bulk action completed'),
    )
  }),

  http.get(`${TEST_API_BASE_URL}/enrollments/export`, () =>
    HttpResponse.text('enrollmentCode,status,studentName\n', {
      headers: { 'Content-Type': 'text/csv' },
    }),
  ),

  http.post(`${TEST_API_BASE_URL}/enrollments`, async ({ request }) => {
    const body = (await request.json()) as { studentId: string; batchId: string }
    const student = findStudentById(body.studentId)
    const batch = findBatchById(body.batchId)
    if (!student || !batch) {
      return HttpResponse.json(errorEnvelope('Student or batch not found', 'NOT_FOUND'), {
        status: 404,
      })
    }
    const duplicate = enrollments.find(
      (e) =>
        e.studentId === body.studentId &&
        e.batchId === body.batchId &&
        !['CANCELLED', 'DROPPED'].includes(e.status),
    )
    if (duplicate) {
      return HttpResponse.json(
        errorEnvelope('Student is already enrolled in this batch', 'CONFLICT'),
        { status: 409 },
      )
    }

    const enrollment = makeEnrollment({
      studentId: body.studentId,
      batchId: body.batchId,
      courseId: batch.courseId,
      status: 'PENDING',
    })
    enrollments.push(enrollment)
    const result = reserveSeatOrWaitlist(enrollment)
    if (!result.ok) {
      enrollments.pop()
      return HttpResponse.json(errorEnvelope(result.message, result.code), { status: 409 })
    }
    pushAudit(enrollment.id, 'enrollment.created')
    return HttpResponse.json(successEnvelope(toDetailDto(enrollment), 'Enrollment created'), {
      status: 201,
    })
  }),

  http.get(`${TEST_API_BASE_URL}/enrollments/:id`, ({ params }) => {
    const enrollment = enrollments.find((e) => e.id === params.id)
    if (!enrollment) {
      return HttpResponse.json(errorEnvelope('Enrollment not found', 'NOT_FOUND'), { status: 404 })
    }
    return HttpResponse.json(successEnvelope(toDetailDto(enrollment)))
  }),

  http.get(`${TEST_API_BASE_URL}/enrollments/:id/audit`, ({ params, request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? '1')
    const limit = Number(url.searchParams.get('limit') ?? '20')
    const entries = auditLog[params.id as string] ?? []
    const start = (page - 1) * limit
    return HttpResponse.json(
      paginatedEnvelope(entries.slice(start, start + limit), page, limit, entries.length),
    )
  }),

  http.post(`${TEST_API_BASE_URL}/enrollments/:id/confirm`, ({ params }) => {
    const enrollment = enrollments.find((e) => e.id === params.id)
    if (!enrollment) {
      return HttpResponse.json(errorEnvelope('Enrollment not found', 'NOT_FOUND'), { status: 404 })
    }
    enrollment.status = 'CONFIRMED'
    enrollment.confirmedAt = new Date().toISOString()
    pushAudit(enrollment.id, 'enrollment.confirmed')
    return HttpResponse.json(successEnvelope(toDetailDto(enrollment), 'Enrollment confirmed'))
  }),

  http.post(`${TEST_API_BASE_URL}/enrollments/:id/promote-waitlist`, ({ params }) => {
    const enrollment = enrollments.find((e) => e.id === params.id)
    if (!enrollment) {
      return HttpResponse.json(errorEnvelope('Enrollment not found', 'NOT_FOUND'), { status: 404 })
    }
    if (enrollment.status !== 'WAITLISTED') {
      return HttpResponse.json(errorEnvelope('Enrollment is not waitlisted', 'CONFLICT'), {
        status: 409,
      })
    }
    const batch = findBatchById(enrollment.batchId)
    if (!batch || batch.availableSeats <= 0) {
      return HttpResponse.json(errorEnvelope('No seat is currently available', 'CONFLICT'), {
        status: 409,
      })
    }
    removeFromWaitlist(enrollment.id, enrollment.batchId)
    enrollment.status = 'CONFIRMED'
    enrollment.waitlistPosition = null
    enrollment.confirmedAt = new Date().toISOString()
    adjustBatchOccupiedSeats(enrollment.batchId, 1)
    pushAudit(enrollment.id, 'enrollment.promoted')
    return HttpResponse.json(
      successEnvelope(toDetailDto(enrollment), 'Student promoted from waitlist'),
    )
  }),

  http.post(`${TEST_API_BASE_URL}/enrollments/:id/activate`, ({ params }) => {
    const enrollment = enrollments.find((e) => e.id === params.id)
    if (!enrollment) {
      return HttpResponse.json(errorEnvelope('Enrollment not found', 'NOT_FOUND'), { status: 404 })
    }
    enrollment.status = 'ACTIVE'
    enrollment.activatedAt = new Date().toISOString()
    enrollment.accessStartsAt = new Date().toISOString()
    pushAudit(enrollment.id, 'enrollment.activated')
    return HttpResponse.json(successEnvelope(toDetailDto(enrollment), 'Enrollment activated'))
  }),

  http.post(`${TEST_API_BASE_URL}/enrollments/:id/suspend`, ({ params }) => {
    const enrollment = enrollments.find((e) => e.id === params.id)
    if (!enrollment) {
      return HttpResponse.json(errorEnvelope('Enrollment not found', 'NOT_FOUND'), { status: 404 })
    }
    enrollment.status = 'SUSPENDED'
    enrollment.suspendedAt = new Date().toISOString()
    pushAudit(enrollment.id, 'enrollment.suspended')
    return HttpResponse.json(successEnvelope(toDetailDto(enrollment), 'Enrollment suspended'))
  }),

  http.post(`${TEST_API_BASE_URL}/enrollments/:id/resume`, ({ params }) => {
    const enrollment = enrollments.find((e) => e.id === params.id)
    if (!enrollment) {
      return HttpResponse.json(errorEnvelope('Enrollment not found', 'NOT_FOUND'), { status: 404 })
    }
    enrollment.status = 'ACTIVE'
    enrollment.resumedAt = new Date().toISOString()
    pushAudit(enrollment.id, 'enrollment.resumed')
    return HttpResponse.json(successEnvelope(toDetailDto(enrollment), 'Enrollment resumed'))
  }),

  http.post(`${TEST_API_BASE_URL}/enrollments/:id/complete`, ({ params }) => {
    const enrollment = enrollments.find((e) => e.id === params.id)
    if (!enrollment) {
      return HttpResponse.json(errorEnvelope('Enrollment not found', 'NOT_FOUND'), { status: 404 })
    }
    releaseSeatIfNeeded(enrollment, enrollment.status)
    enrollment.status = 'COMPLETED'
    enrollment.completedAt = new Date().toISOString()
    pushAudit(enrollment.id, 'enrollment.completed')
    return HttpResponse.json(successEnvelope(toDetailDto(enrollment), 'Enrollment completed'))
  }),

  http.post(`${TEST_API_BASE_URL}/enrollments/:id/cancel`, async ({ params, request }) => {
    const enrollment = enrollments.find((e) => e.id === params.id)
    if (!enrollment) {
      return HttpResponse.json(errorEnvelope('Enrollment not found', 'NOT_FOUND'), { status: 404 })
    }
    const body = (await request.json().catch(() => ({}))) as { reason?: string }
    releaseSeatIfNeeded(enrollment, enrollment.status)
    if (enrollment.status === 'WAITLISTED') removeFromWaitlist(enrollment.id, enrollment.batchId)
    enrollment.status = 'CANCELLED'
    enrollment.cancelledAt = new Date().toISOString()
    enrollment.cancellationReason = body.reason ?? null
    pushAudit(enrollment.id, 'enrollment.cancelled')
    return HttpResponse.json(successEnvelope(toDetailDto(enrollment), 'Enrollment cancelled'))
  }),

  http.post(`${TEST_API_BASE_URL}/enrollments/:id/drop`, async ({ params, request }) => {
    const enrollment = enrollments.find((e) => e.id === params.id)
    if (!enrollment) {
      return HttpResponse.json(errorEnvelope('Enrollment not found', 'NOT_FOUND'), { status: 404 })
    }
    const body = (await request.json().catch(() => ({}))) as { reason?: string }
    releaseSeatIfNeeded(enrollment, enrollment.status)
    enrollment.status = 'DROPPED'
    enrollment.droppedAt = new Date().toISOString()
    enrollment.dropReason = body.reason ?? null
    pushAudit(enrollment.id, 'enrollment.dropped')
    return HttpResponse.json(successEnvelope(toDetailDto(enrollment), 'Student dropped'))
  }),

  http.post(`${TEST_API_BASE_URL}/enrollments/:id/transfer`, async ({ params, request }) => {
    const source = enrollments.find((e) => e.id === params.id)
    if (!source) {
      return HttpResponse.json(errorEnvelope('Enrollment not found', 'NOT_FOUND'), { status: 404 })
    }
    const body = (await request.json()) as { targetBatchId: string; reason?: string }
    const targetBatch = findBatchById(body.targetBatchId)
    if (!targetBatch) {
      return HttpResponse.json(errorEnvelope('Target batch not found', 'NOT_FOUND'), {
        status: 404,
      })
    }
    if (targetBatch.courseId !== source.courseId) {
      return HttpResponse.json(
        errorEnvelope('Target batch must belong to the same course', 'CONFLICT'),
        { status: 409 },
      )
    }

    const target = makeEnrollment({
      studentId: source.studentId,
      batchId: body.targetBatchId,
      courseId: source.courseId,
      status: 'PENDING',
      source: 'TRANSFER',
      transferredFromEnrollmentId: source.id,
      transferReason: body.reason ?? null,
    })
    enrollments.push(target)
    const result = reserveSeatOrWaitlist(target)
    if (!result.ok) {
      enrollments.pop()
      return HttpResponse.json(errorEnvelope(result.message, result.code), { status: 409 })
    }

    releaseSeatIfNeeded(source, source.status)
    source.status = 'DROPPED'
    source.droppedAt = new Date().toISOString()
    source.transferredToEnrollmentId = target.id

    pushAudit(source.id, 'enrollment.transferred_out')
    pushAudit(target.id, 'enrollment.transferred_in')

    return HttpResponse.json(successEnvelope(toDetailDto(target), 'Student transferred'), {
      status: 201,
    })
  }),
]
