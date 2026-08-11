import { delay, http, HttpResponse } from 'msw'

import { TEST_API_BASE_URL } from '@/test/api-base-url'
import type {
  AdminBatch,
  AdminBatchListItem,
  BatchStatus,
  ReadinessBlocker,
  TrainerConflict,
  WaitlistEntry,
} from '@/features/batches/types'

/** Mirrors `backend/src/services/batch-management.service.ts`'s DTO shapes for the endpoints the frontend actually calls. */

let batches: AdminBatch[] = []
let idCounter = 0

function seedDefaultBatches(): void {
  idCounter = 0
  batches = [
    makeBatch({
      name: 'August 2026 Morning Batch',
      courseId: 'course-1',
      status: 'DRAFT',
      primaryTrainerId: null,
      weeklySchedule: [],
    }),
    makeBatch({
      name: 'September 2026 Evening Batch',
      courseId: 'course-1',
      status: 'SCHEDULED',
      primaryTrainerId: 'trainer-1',
      scheduledAt: new Date().toISOString(),
      weeklySchedule: [
        {
          dayOfWeek: 'MONDAY',
          startTime: '18:00',
          endTime: '20:00',
          sessionLabel: null,
          locationOverride: null,
          deliveryModeOverride: null,
        },
      ],
    }),
  ]
}

function makeBatch(
  overrides: Partial<AdminBatch> & Pick<AdminBatch, 'name' | 'courseId'>,
): AdminBatch {
  idCounter += 1
  const now = new Date().toISOString()
  return {
    id: `batch-${idCounter.toString()}`,
    batchCode: `DM-BAT-2026-${idCounter.toString().padStart(6, '0')}`,
    shortName: null,
    description: 'A scheduled delivery instance of the course.',
    startDate: null,
    endDate: null,
    enrollmentOpenDate: null,
    enrollmentCloseDate: null,
    timezone: 'Asia/Kolkata',
    deliveryMode: 'ONLINE',
    status: overrides.status ?? 'DRAFT',
    primaryTrainerId: null,
    assistantTrainerIds: [],
    maxStudents: 30,
    occupiedSeats: 0,
    availableSeats: 30,
    minimumStudents: null,
    waitlistEnabled: false,
    location: {
      meetingProvider: 'GOOGLE_MEET',
      virtualClassNotes: null,
      venueName: null,
      addressLine1: null,
      addressLine2: null,
      city: null,
      state: null,
      postalCode: null,
      country: null,
      room: null,
      mapUrl: null,
    },
    weeklySchedule: [],
    calendarExceptions: [],
    tags: [],
    internalNotes: null,
    isDeleted: false,
    scheduledAt: null,
    activatedAt: null,
    completedAt: null,
    cancelledAt: null,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function toListItem(batch: AdminBatch): AdminBatchListItem {
  return {
    id: batch.id,
    batchCode: batch.batchCode,
    name: batch.name,
    shortName: batch.shortName,
    courseId: batch.courseId,
    startDate: batch.startDate,
    endDate: batch.endDate,
    timezone: batch.timezone,
    deliveryMode: batch.deliveryMode,
    status: batch.status,
    primaryTrainerId: batch.primaryTrainerId,
    maxStudents: batch.maxStudents,
    occupiedSeats: batch.occupiedSeats,
    availableSeats: batch.availableSeats,
    waitlistEnabled: batch.waitlistEnabled,
    isDeleted: batch.isDeleted,
    createdAt: batch.createdAt,
    updatedAt: batch.updatedAt,
  }
}

const IDENTITY_FIELDS = ['id', 'batchCode', 'createdAt', 'updatedAt'] as const

/** Used by the duplicate-batch handler so `makeBatch`'s own identity/audit-field defaults win instead of being clobbered by a straight `...source` spread. */
function omitIdentityFields(
  batch: AdminBatch,
): Omit<AdminBatch, 'id' | 'batchCode' | 'createdAt' | 'updatedAt'> {
  const entries = Object.entries(batch).filter(
    ([key]) => !(IDENTITY_FIELDS as readonly string[]).includes(key),
  )
  return Object.fromEntries(entries) as Omit<
    AdminBatch,
    'id' | 'batchCode' | 'createdAt' | 'updatedAt'
  >
}

let createBatchDelayMs = 0
let createBatchCallCount = 0

/** Lets duplicate-submission tests keep a create-batch request pending long enough to observe the wizard's submit button disabled — mirrors `auth.handlers.ts`'s `setLoginDelayMs`. */
export function setCreateBatchDelayMs(ms: number): void {
  createBatchDelayMs = ms
}

/** How many times `POST /batches` was actually invoked — the definitive signal for a duplicate-submission test, independent of UI-timing flakiness. */
export function getCreateBatchCallCount(): number {
  return createBatchCallCount
}

export function resetBatchesMockState(): void {
  seedDefaultBatches()
  createBatchDelayMs = 0
  createBatchCallCount = 0
  resetBatchWaitlistMock()
}

/** Cross-handler accessor, mirrors `courses.handlers.ts`'s `findCourseById`. */
export function findBatchById(batchId: string): AdminBatch | undefined {
  return batches.find((batch) => batch.id === batchId)
}

/** Called by `enrollments.handlers.ts` to keep a batch's mock `occupiedSeats`/`availableSeats` consistent with simulated enrollment create/lifecycle actions — a simplified stand-in for the backend's real transactional capacity engine (Phase 10B Part 1). */
export function adjustBatchOccupiedSeats(batchId: string, delta: number): void {
  const batch = findBatchById(batchId)
  if (!batch) return
  batch.occupiedSeats = Math.max(0, batch.occupiedSeats + delta)
  batch.availableSeats = Math.max(0, batch.maxStudents - batch.occupiedSeats)
}

let waitlistMock: Record<string, WaitlistEntry[]> = {}

export function setBatchWaitlistMock(batchId: string, entries: WaitlistEntry[]): void {
  waitlistMock[batchId] = entries
}

export function resetBatchWaitlistMock(): void {
  waitlistMock = {}
}

seedDefaultBatches()

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
  errors?: { field: string; code: string; message: string }[],
) {
  return { success: false, message, code, errors, requestId: 'test-request-id' }
}

/** A batch is ready to schedule once it has a primary trainer and at least one weekly session — a simplified stand-in for the backend's real readiness rules. */
function computeReadinessBlockers(batch: AdminBatch): ReadinessBlocker[] {
  const blockers: ReadinessBlocker[] = []
  if (!batch.primaryTrainerId) {
    blockers.push({
      field: 'primaryTrainerId',
      code: 'MISSING_PRIMARY_TRAINER',
      message: 'A primary trainer must be assigned before scheduling',
    })
  }
  if (batch.weeklySchedule.length === 0) {
    blockers.push({
      field: 'weeklySchedule',
      code: 'EMPTY_WEEKLY_SCHEDULE',
      message: 'At least one weekly session must be added before scheduling',
    })
  }
  return blockers
}

/** `batch-2` is seeded with a hardcoded conflict pair so `ConflictsPanel` tests can assert both conflict types render distinctly. */
function computeConflicts(batch: AdminBatch): TrainerConflict[] {
  if (batch.id !== 'batch-2') return []
  return [
    {
      type: 'AVAILABILITY',
      trainerId: batch.primaryTrainerId ?? 'trainer-1',
      message: 'Trainer has declared unavailability during this weekly slot',
    },
    {
      type: 'CROSS_BATCH',
      trainerId: batch.primaryTrainerId ?? 'trainer-1',
      message: 'Trainer is already booked on another batch at this time',
      conflictingBatchId: 'batch-1',
      conflictingBatchCode: 'DM-BAT-2026-000001',
    },
  ]
}

function transitionTo(batch: AdminBatch, status: BatchStatus, timestampField?: keyof AdminBatch) {
  batch.status = status
  if (timestampField) {
    ;(batch as unknown as Record<string, string>)[timestampField] = new Date().toISOString()
  }
}

export const batchesHandlers = [
  http.get(`${TEST_API_BASE_URL}/batches`, ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? '1')
    const limit = Number(url.searchParams.get('limit') ?? '20')
    const search = url.searchParams.get('search')
    const status = url.searchParams.get('status')
    const deliveryMode = url.searchParams.get('deliveryMode')
    const courseId = url.searchParams.get('courseId')
    const includeDeleted = url.searchParams.get('includeDeleted') === 'true'

    let filtered = includeDeleted ? batches : batches.filter((batch) => !batch.isDeleted)
    if (search) {
      filtered = filtered.filter(
        (batch) =>
          batch.name.toLowerCase().includes(search.toLowerCase()) ||
          batch.batchCode.toLowerCase().includes(search.toLowerCase()),
      )
    }
    if (status) filtered = filtered.filter((batch) => batch.status === status)
    if (deliveryMode) filtered = filtered.filter((batch) => batch.deliveryMode === deliveryMode)
    if (courseId) filtered = filtered.filter((batch) => batch.courseId === courseId)

    const start = (page - 1) * limit
    const pageItems = filtered.slice(start, start + limit).map(toListItem)
    return HttpResponse.json(paginatedEnvelope(pageItems, page, limit, filtered.length))
  }),

  http.post(`${TEST_API_BASE_URL}/batches`, async ({ request }) => {
    createBatchCallCount += 1
    if (createBatchDelayMs > 0) {
      await delay(createBatchDelayMs)
    }
    const body = (await request.json()) as { name: string; courseId: string }
    const created = makeBatch({ name: body.name, courseId: body.courseId, status: 'DRAFT' })
    batches.push(created)
    return HttpResponse.json(successEnvelope(created, 'Batch created'), { status: 201 })
  }),

  // Order matters: `/bulk/:action` and `/export` must be registered before
  // the `/:id` param routes below, or MSW will match them as `id="bulk"` /
  // `id="export"` — mirrors `courses.handlers.ts`'s note on the same issue.
  http.post(`${TEST_API_BASE_URL}/batches/bulk/:action`, async ({ request, params }) => {
    const body = (await request.json()) as { action: string; batchIds: string[] }
    const succeeded: string[] = []
    const failed: { id: string; reason: string }[] = []

    for (const id of body.batchIds) {
      const batch = batches.find((candidate) => candidate.id === id)
      if (!batch) {
        failed.push({ id, reason: 'Batch not found' })
        continue
      }
      if (params.action === 'archive') batch.status = 'ARCHIVED'
      else if (params.action === 'cancel') batch.status = 'CANCELLED'
      else batch.isDeleted = true
      succeeded.push(id)
    }

    return HttpResponse.json(successEnvelope({ succeeded, failed }, 'Bulk action completed'))
  }),

  http.get(`${TEST_API_BASE_URL}/batches/export`, () =>
    HttpResponse.text('batchCode,name,status\n', {
      headers: { 'Content-Type': 'text/csv' },
    }),
  ),

  http.get(`${TEST_API_BASE_URL}/batches/:id`, ({ params }) => {
    const batch = batches.find((candidate) => candidate.id === params.id)
    if (!batch) {
      return HttpResponse.json(errorEnvelope('Batch not found', 'NOT_FOUND'), { status: 404 })
    }
    return HttpResponse.json(successEnvelope(batch))
  }),

  http.patch(`${TEST_API_BASE_URL}/batches/:id`, async ({ params, request }) => {
    const batch = batches.find((candidate) => candidate.id === params.id)
    if (!batch) {
      return HttpResponse.json(errorEnvelope('Batch not found', 'NOT_FOUND'), { status: 404 })
    }
    const body = (await request.json()) as Partial<AdminBatch>
    Object.assign(batch, body)
    return HttpResponse.json(successEnvelope(batch, 'Batch updated'))
  }),

  http.post(`${TEST_API_BASE_URL}/batches/:id/readiness-check`, ({ params }) => {
    const batch = batches.find((candidate) => candidate.id === params.id)
    if (!batch) {
      return HttpResponse.json(errorEnvelope('Batch not found', 'NOT_FOUND'), { status: 404 })
    }
    const blockers = computeReadinessBlockers(batch)
    return HttpResponse.json(successEnvelope({ ready: blockers.length === 0, blockers }))
  }),

  http.get(`${TEST_API_BASE_URL}/batches/:id/conflicts`, ({ params }) => {
    const batch = batches.find((candidate) => candidate.id === params.id)
    if (!batch) {
      return HttpResponse.json(errorEnvelope('Batch not found', 'NOT_FOUND'), { status: 404 })
    }
    return HttpResponse.json(successEnvelope(computeConflicts(batch)))
  }),

  http.post(`${TEST_API_BASE_URL}/batches/:id/trainers`, async ({ params, request }) => {
    const batch = batches.find((candidate) => candidate.id === params.id)
    if (!batch) {
      return HttpResponse.json(errorEnvelope('Batch not found', 'NOT_FOUND'), { status: 404 })
    }
    const body = (await request.json()) as {
      primaryTrainerId: string | null
      assistantTrainerIds: string[]
    }
    batch.primaryTrainerId = body.primaryTrainerId
    batch.assistantTrainerIds = body.assistantTrainerIds
    return HttpResponse.json(successEnvelope(batch, 'Trainers updated'))
  }),

  http.post(`${TEST_API_BASE_URL}/batches/:id/weekly-schedule`, async ({ params, request }) => {
    const batch = batches.find((candidate) => candidate.id === params.id)
    if (!batch) {
      return HttpResponse.json(errorEnvelope('Batch not found', 'NOT_FOUND'), { status: 404 })
    }
    const body = (await request.json()) as { weeklySchedule: AdminBatch['weeklySchedule'] }
    batch.weeklySchedule = body.weeklySchedule
    return HttpResponse.json(successEnvelope(batch, 'Weekly schedule updated'))
  }),

  http.post(`${TEST_API_BASE_URL}/batches/:id/calendar-exceptions`, async ({ params, request }) => {
    const batch = batches.find((candidate) => candidate.id === params.id)
    if (!batch) {
      return HttpResponse.json(errorEnvelope('Batch not found', 'NOT_FOUND'), { status: 404 })
    }
    const body = (await request.json()) as { calendarExceptions: AdminBatch['calendarExceptions'] }
    batch.calendarExceptions = body.calendarExceptions
    return HttpResponse.json(successEnvelope(batch, 'Calendar exceptions updated'))
  }),

  http.post(`${TEST_API_BASE_URL}/batches/:id/lifecycle/schedule`, ({ params }) => {
    const batch = batches.find((candidate) => candidate.id === params.id)
    if (!batch) {
      return HttpResponse.json(errorEnvelope('Batch not found', 'NOT_FOUND'), { status: 404 })
    }
    const blockers = computeReadinessBlockers(batch)
    if (blockers.length > 0) {
      return HttpResponse.json(
        errorEnvelope('Batch is not ready to schedule', 'UNPROCESSABLE_ENTITY', blockers),
        { status: 422 },
      )
    }
    transitionTo(batch, 'SCHEDULED', 'scheduledAt')
    return HttpResponse.json(successEnvelope(batch, 'Batch scheduled'))
  }),

  http.post(`${TEST_API_BASE_URL}/batches/:id/lifecycle/unschedule`, ({ params }) => {
    const batch = batches.find((candidate) => candidate.id === params.id)
    if (!batch) {
      return HttpResponse.json(errorEnvelope('Batch not found', 'NOT_FOUND'), { status: 404 })
    }
    batch.status = 'DRAFT'
    batch.scheduledAt = null
    return HttpResponse.json(successEnvelope(batch, 'Batch returned to draft'))
  }),

  http.post(`${TEST_API_BASE_URL}/batches/:id/lifecycle/activate`, ({ params }) => {
    const batch = batches.find((candidate) => candidate.id === params.id)
    if (!batch) {
      return HttpResponse.json(errorEnvelope('Batch not found', 'NOT_FOUND'), { status: 404 })
    }
    transitionTo(batch, 'ACTIVE', 'activatedAt')
    return HttpResponse.json(successEnvelope(batch, 'Batch activated'))
  }),

  http.post(`${TEST_API_BASE_URL}/batches/:id/lifecycle/complete`, ({ params }) => {
    const batch = batches.find((candidate) => candidate.id === params.id)
    if (!batch) {
      return HttpResponse.json(errorEnvelope('Batch not found', 'NOT_FOUND'), { status: 404 })
    }
    transitionTo(batch, 'COMPLETED', 'completedAt')
    return HttpResponse.json(successEnvelope(batch, 'Batch completed'))
  }),

  http.post(`${TEST_API_BASE_URL}/batches/:id/lifecycle/cancel`, ({ params }) => {
    const batch = batches.find((candidate) => candidate.id === params.id)
    if (!batch) {
      return HttpResponse.json(errorEnvelope('Batch not found', 'NOT_FOUND'), { status: 404 })
    }
    transitionTo(batch, 'CANCELLED', 'cancelledAt')
    return HttpResponse.json(successEnvelope(batch, 'Batch cancelled'))
  }),

  http.post(`${TEST_API_BASE_URL}/batches/:id/lifecycle/archive`, ({ params }) => {
    const batch = batches.find((candidate) => candidate.id === params.id)
    if (!batch) {
      return HttpResponse.json(errorEnvelope('Batch not found', 'NOT_FOUND'), { status: 404 })
    }
    transitionTo(batch, 'ARCHIVED', 'archivedAt')
    return HttpResponse.json(successEnvelope(batch, 'Batch archived'))
  }),

  http.post(`${TEST_API_BASE_URL}/batches/:id/lifecycle/restore`, ({ params }) => {
    const batch = batches.find((candidate) => candidate.id === params.id)
    if (!batch) {
      return HttpResponse.json(errorEnvelope('Batch not found', 'NOT_FOUND'), { status: 404 })
    }
    if (batch.isDeleted) {
      batch.isDeleted = false
    } else {
      batch.status = 'DRAFT'
      batch.archivedAt = null
    }
    return HttpResponse.json(successEnvelope(batch, 'Batch restored'))
  }),

  http.delete(`${TEST_API_BASE_URL}/batches/:id`, ({ params }) => {
    const batch = batches.find((candidate) => candidate.id === params.id)
    if (!batch) {
      return HttpResponse.json(errorEnvelope('Batch not found', 'NOT_FOUND'), { status: 404 })
    }
    batch.isDeleted = true
    return HttpResponse.json(successEnvelope(null, 'Batch deleted'))
  }),

  http.post(`${TEST_API_BASE_URL}/batches/:id/duplicate`, async ({ params, request }) => {
    const source = batches.find((candidate) => candidate.id === params.id)
    if (!source) {
      return HttpResponse.json(errorEnvelope('Batch not found', 'NOT_FOUND'), { status: 404 })
    }
    const body = (await request.json()) as { name: string; startDate?: string; endDate?: string }
    const duplicated = makeBatch({
      ...omitIdentityFields(source),
      name: body.name,
      startDate: body.startDate ?? null,
      endDate: body.endDate ?? null,
      status: 'DRAFT',
      scheduledAt: null,
      activatedAt: null,
      completedAt: null,
      cancelledAt: null,
      archivedAt: null,
      isDeleted: false,
    })
    batches.push(duplicated)
    return HttpResponse.json(successEnvelope(duplicated, 'Batch duplicated'), { status: 201 })
  }),

  http.get(`${TEST_API_BASE_URL}/batches/:id/audit`, () =>
    HttpResponse.json(paginatedEnvelope([], 1, 20, 0)),
  ),

  http.get(`${TEST_API_BASE_URL}/batches/:id/capacity`, ({ params }) => {
    const batch = batches.find((candidate) => candidate.id === params.id)
    if (!batch) {
      return HttpResponse.json(errorEnvelope('Batch not found', 'NOT_FOUND'), { status: 404 })
    }
    return HttpResponse.json(
      successEnvelope({
        maxStudents: batch.maxStudents,
        occupiedSeats: batch.occupiedSeats,
        availableSeats: batch.availableSeats,
        waitlistCount: (waitlistMock[batch.id] ?? []).length,
      }),
    )
  }),

  http.get(`${TEST_API_BASE_URL}/batches/:id/waitlist`, ({ params }) =>
    HttpResponse.json(successEnvelope(waitlistMock[params.id as string] ?? [])),
  ),
]
