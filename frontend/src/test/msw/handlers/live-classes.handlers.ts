import { http, HttpResponse } from 'msw'

import { TEST_API_BASE_URL } from '@/test/api-base-url'
import type { AdminLiveClass, GeneratedOccurrencePreview } from '@/features/live-classes/types'
import type {
  AttendanceRosterRow,
  AttendanceStatus,
  SessionAttendance,
} from '@/features/attendance/types'
import type { StudentLiveClass } from '@/features/student-live-classes/types'

/**
 * Mirrors the Phase 12 backend DTO shapes (`live-class-dto.ts`,
 * `attendance-dto.ts`, `student-live-class-dto.ts`) for the routes the
 * frontend actually calls — one in-memory store shared across the admin
 * (`/live-classes/*`), trainer (`/trainer/live-classes/*`), and student
 * (`/student/live-classes/*`, `/student/attendance`) namespaces, matching
 * how the real backend shares one `live_classes`/`attendance` collection
 * across all three route files.
 */

interface MockSession extends AdminLiveClass {
  roster: AttendanceRosterRow[]
}

const TRAINER_1 = { id: 'trainer-1', name: 'Arjun Mehta' }
const STUDENT_1 = {
  studentId: 'student-1',
  studentCode: 'DM-STU-2026-000001',
  studentName: 'Priya Sharma',
}
const STUDENT_2 = {
  studentId: 'student-2',
  studentCode: 'DM-STU-2026-000002',
  studentName: 'Rahul Verma',
}

function baseRoster(): AttendanceRosterRow[] {
  return [
    {
      studentId: STUDENT_1.studentId,
      studentCode: STUDENT_1.studentCode,
      studentName: STUDENT_1.studentName,
      enrollmentId: 'enrollment-1',
      enrollmentStatus: 'ACTIVE',
      attendanceId: null,
      status: 'UNMARKED',
      checkInAt: null,
      notes: null,
    },
    {
      studentId: STUDENT_2.studentId,
      studentCode: STUDENT_2.studentCode,
      studentName: STUDENT_2.studentName,
      enrollmentId: 'enrollment-2',
      enrollmentStatus: 'ACTIVE',
      attendanceId: null,
      status: 'UNMARKED',
      checkInAt: null,
      notes: null,
    },
  ]
}

function makeSession(
  overrides: Partial<MockSession> & Pick<MockSession, 'id' | 'title' | 'status'>,
): MockSession {
  const now = new Date().toISOString()
  return {
    sessionCode: `DM-CLS-2026-${overrides.id.padStart(6, '0')}`,
    batchId: 'batch-1',
    batchCode: 'DM-BAT-2026-000001',
    batchName: 'Evening Batch — Jan 2026',
    courseId: 'course-1',
    courseCode: 'DM-CRS-2026-000001',
    courseTitle: 'Full-Stack Web Development',
    description: null,
    scheduledDate: now,
    startDateTime: now,
    endDateTime: now,
    timezone: 'Asia/Kolkata',
    durationMinutes: 120,
    deliveryMode: 'ONLINE',
    provider: 'MANUAL_LINK',
    joinUrl: 'https://meet.example.com/room',
    hostUrl: 'https://meet.example.com/room/host',
    providerMeetingId: null,
    venue: null,
    trainers: [TRAINER_1],
    primaryTrainer: TRAINER_1,
    source: 'MANUAL',
    actualStartedAt: null,
    actualEndedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    overrideReason: null,
    attendanceStatus: 'OPEN',
    attendanceFinalizedAt: null,
    createdAt: now,
    updatedAt: now,
    roster: baseRoster(),
    ...overrides,
  }
}

let sessions: MockSession[] = []

function seedDefaultSessions(): void {
  const future = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
  const soon = new Date(Date.now() + 5 * 60 * 1000).toISOString()
  const liveEnd = new Date(Date.now() + 55 * 60 * 1000).toISOString()

  sessions = [
    makeSession({
      id: '1',
      title: 'Week 1 — Introduction',
      status: 'DRAFT',
      startDateTime: future,
      endDateTime: future,
    }),
    makeSession({
      id: '2',
      title: 'Week 2 — Live Session',
      status: 'LIVE',
      startDateTime: soon,
      endDateTime: liveEnd,
    }),
    makeSession({
      id: '3',
      title: 'Week 0 — Orientation (cancelled)',
      status: 'CANCELLED',
      cancellationReason: 'Trainer unavailable',
      cancelledAt: new Date().toISOString(),
    }),
  ]
}

seedDefaultSessions()

export function resetLiveClassesMockState(): void {
  seedDefaultSessions()
}

function successEnvelope<T>(data: T, message = 'Request completed successfully') {
  return { success: true, message, data, requestId: 'test-request-id' }
}

function errorEnvelope(message: string, code: string) {
  return { success: false, message, code, requestId: 'test-request-id' }
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

function toAdminDto(session: MockSession): AdminLiveClass {
  const dto = { ...session }
  Reflect.deleteProperty(dto, 'roster')
  return dto
}

function toSessionAttendance(session: MockSession): SessionAttendance {
  return {
    sessionId: session.id,
    sessionCode: session.sessionCode,
    sessionTitle: session.title,
    attendanceStatus: session.attendanceStatus,
    attendanceFinalizedAt: session.attendanceFinalizedAt,
    roster: session.roster,
  }
}

function toStudentDto(session: MockSession): StudentLiveClass {
  const now = Date.now()
  const start = new Date(session.startDateTime).getTime()
  const end = new Date(session.endDateTime).getTime()
  const canJoin =
    (session.status === 'SCHEDULED' || session.status === 'LIVE') &&
    now >= start - 15 * 60 * 1000 &&
    now <= end + 15 * 60 * 1000

  return {
    id: session.id,
    sessionCode: session.sessionCode,
    courseId: session.courseId,
    courseTitle: session.courseTitle,
    batchId: session.batchId,
    batchName: session.batchName,
    title: session.title,
    description: session.description,
    scheduledDate: session.scheduledDate,
    startDateTime: session.startDateTime,
    endDateTime: session.endDateTime,
    timezone: session.timezone,
    durationMinutes: session.durationMinutes,
    deliveryMode: session.deliveryMode,
    status: session.status,
    trainerName: session.primaryTrainer?.name ?? null,
    canJoin,
    joinWindowOpensAt: new Date(start - 15 * 60 * 1000).toISOString(),
  }
}

function applyBulkMark(
  session: MockSession,
  records: { studentId: string; status: AttendanceStatus; notes?: string }[],
): { rejected: { studentId: string; reason: string }[] } {
  const rejected: { studentId: string; reason: string }[] = []
  for (const record of records) {
    const row = session.roster.find((item) => item.studentId === record.studentId)
    if (!row) {
      rejected.push({
        studentId: record.studentId,
        reason: 'Not an eligible student for this session',
      })
      continue
    }
    row.status = record.status
    row.notes = record.notes ?? row.notes
  }
  return { rejected }
}

export const liveClassesHandlers = [
  // ---- Admin ----
  http.get(`${TEST_API_BASE_URL}/live-classes`, ({ request }) => {
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const batchId = url.searchParams.get('batchId')
    const search = url.searchParams.get('search')
    let filtered = sessions
    if (status) filtered = filtered.filter((session) => session.status === status)
    if (batchId) filtered = filtered.filter((session) => session.batchId === batchId)
    if (search) {
      filtered = filtered.filter((session) =>
        session.title.toLowerCase().includes(search.toLowerCase()),
      )
    }
    return HttpResponse.json(paginatedEnvelope(filtered.map(toAdminDto), 1, 20, filtered.length))
  }),

  http.get(`${TEST_API_BASE_URL}/live-classes/:id`, ({ params }) => {
    const session = sessions.find((item) => item.id === params.id)
    if (!session)
      return HttpResponse.json(errorEnvelope('Session not found', 'NOT_FOUND'), { status: 404 })
    return HttpResponse.json(successEnvelope(toAdminDto(session)))
  }),

  http.post(`${TEST_API_BASE_URL}/live-classes/generate/preview`, () =>
    HttpResponse.json(successEnvelope<GeneratedOccurrencePreview[]>([])),
  ),
  http.post(`${TEST_API_BASE_URL}/live-classes/generate`, () =>
    HttpResponse.json(successEnvelope({ created: [], skipped: 0 })),
  ),

  http.post(`${TEST_API_BASE_URL}/live-classes/:id/schedule`, ({ params }) => {
    const session = sessions.find((item) => item.id === params.id)
    if (!session)
      return HttpResponse.json(errorEnvelope('Session not found', 'NOT_FOUND'), { status: 404 })
    session.status = 'SCHEDULED'
    return HttpResponse.json(successEnvelope(toAdminDto(session), 'Session scheduled'))
  }),
  http.post(`${TEST_API_BASE_URL}/live-classes/:id/start`, ({ params }) => {
    const session = sessions.find((item) => item.id === params.id)
    if (!session)
      return HttpResponse.json(errorEnvelope('Session not found', 'NOT_FOUND'), { status: 404 })
    session.status = 'LIVE'
    return HttpResponse.json(successEnvelope(toAdminDto(session), 'Session started'))
  }),
  http.post(`${TEST_API_BASE_URL}/live-classes/:id/complete`, ({ params }) => {
    const session = sessions.find((item) => item.id === params.id)
    if (!session)
      return HttpResponse.json(errorEnvelope('Session not found', 'NOT_FOUND'), { status: 404 })
    session.status = 'COMPLETED'
    return HttpResponse.json(successEnvelope(toAdminDto(session), 'Session marked complete'))
  }),
  http.post(`${TEST_API_BASE_URL}/live-classes/:id/cancel`, async ({ params, request }) => {
    const session = sessions.find((item) => item.id === params.id)
    if (!session)
      return HttpResponse.json(errorEnvelope('Session not found', 'NOT_FOUND'), { status: 404 })
    const body = (await request.json()) as { reason: string }
    session.status = 'CANCELLED'
    session.cancellationReason = body.reason
    return HttpResponse.json(successEnvelope(toAdminDto(session), 'Session cancelled'))
  }),

  // ---- Attendance (admin + trainer share the same shape) ----
  http.get(`${TEST_API_BASE_URL}/live-classes/:id/attendance`, ({ params }) => {
    const session = sessions.find((item) => item.id === params.id)
    if (!session)
      return HttpResponse.json(errorEnvelope('Session not found', 'NOT_FOUND'), { status: 404 })
    return HttpResponse.json(successEnvelope(toSessionAttendance(session)))
  }),
  http.patch(`${TEST_API_BASE_URL}/live-classes/:id/attendance`, async ({ params, request }) => {
    const session = sessions.find((item) => item.id === params.id)
    if (!session)
      return HttpResponse.json(errorEnvelope('Session not found', 'NOT_FOUND'), { status: 404 })
    if (session.attendanceStatus === 'FINALIZED') {
      return HttpResponse.json(
        errorEnvelope('Attendance is finalized — reopen it first to make changes', 'CONFLICT'),
        { status: 409 },
      )
    }
    const body = (await request.json()) as {
      records: { studentId: string; status: AttendanceStatus; notes?: string }[]
    }
    const { rejected } = applyBulkMark(session, body.records)
    return HttpResponse.json(successEnvelope({ roster: toSessionAttendance(session), rejected }))
  }),
  http.post(`${TEST_API_BASE_URL}/live-classes/:id/attendance/finalize`, ({ params }) => {
    const session = sessions.find((item) => item.id === params.id)
    if (!session)
      return HttpResponse.json(errorEnvelope('Session not found', 'NOT_FOUND'), { status: 404 })
    for (const row of session.roster) {
      if (row.status === 'UNMARKED') row.status = 'ABSENT'
    }
    session.attendanceStatus = 'FINALIZED'
    session.attendanceFinalizedAt = new Date().toISOString()
    return HttpResponse.json(successEnvelope(toSessionAttendance(session), 'Attendance finalized'))
  }),
  http.post(`${TEST_API_BASE_URL}/live-classes/:id/attendance/reopen`, ({ params }) => {
    const session = sessions.find((item) => item.id === params.id)
    if (!session)
      return HttpResponse.json(errorEnvelope('Session not found', 'NOT_FOUND'), { status: 404 })
    session.attendanceStatus = 'OPEN'
    session.attendanceFinalizedAt = null
    return HttpResponse.json(successEnvelope(toSessionAttendance(session), 'Attendance reopened'))
  }),

  http.get(`${TEST_API_BASE_URL}/attendance`, () =>
    HttpResponse.json(paginatedEnvelope([], 1, 50, 0)),
  ),

  // ---- Trainer (self-scoped — every mock session here is "owned" by trainer-1) ----
  http.get(`${TEST_API_BASE_URL}/trainer/live-classes`, () =>
    HttpResponse.json(successEnvelope(sessions.map(toAdminDto))),
  ),
  http.get(`${TEST_API_BASE_URL}/trainer/live-classes/:id`, ({ params }) => {
    const session = sessions.find((item) => item.id === params.id)
    if (!session)
      return HttpResponse.json(errorEnvelope('Session not found', 'NOT_FOUND'), { status: 404 })
    return HttpResponse.json(successEnvelope(toAdminDto(session)))
  }),
  http.post(`${TEST_API_BASE_URL}/trainer/live-classes/:id/start`, ({ params }) => {
    const session = sessions.find((item) => item.id === params.id)
    if (!session)
      return HttpResponse.json(errorEnvelope('Session not found', 'NOT_FOUND'), { status: 404 })
    session.status = 'LIVE'
    return HttpResponse.json(successEnvelope(toAdminDto(session), 'Session started'))
  }),
  http.post(`${TEST_API_BASE_URL}/trainer/live-classes/:id/complete`, ({ params }) => {
    const session = sessions.find((item) => item.id === params.id)
    if (!session)
      return HttpResponse.json(errorEnvelope('Session not found', 'NOT_FOUND'), { status: 404 })
    session.status = 'COMPLETED'
    return HttpResponse.json(successEnvelope(toAdminDto(session), 'Session marked complete'))
  }),
  http.get(`${TEST_API_BASE_URL}/trainer/live-classes/:id/attendance`, ({ params }) => {
    const session = sessions.find((item) => item.id === params.id)
    if (!session)
      return HttpResponse.json(errorEnvelope('Session not found', 'NOT_FOUND'), { status: 404 })
    return HttpResponse.json(successEnvelope(toSessionAttendance(session)))
  }),
  http.patch(
    `${TEST_API_BASE_URL}/trainer/live-classes/:id/attendance`,
    async ({ params, request }) => {
      const session = sessions.find((item) => item.id === params.id)
      if (!session)
        return HttpResponse.json(errorEnvelope('Session not found', 'NOT_FOUND'), { status: 404 })
      const body = (await request.json()) as {
        records: { studentId: string; status: AttendanceStatus; notes?: string }[]
      }
      const { rejected } = applyBulkMark(session, body.records)
      return HttpResponse.json(successEnvelope({ roster: toSessionAttendance(session), rejected }))
    },
  ),

  // ---- Student (self-scoped) ----
  http.get(`${TEST_API_BASE_URL}/student/live-classes`, () =>
    // A DRAFT session is never visible to a student — mirrors the real
    // backend, which never even queries DRAFT sessions for this endpoint.
    HttpResponse.json(
      successEnvelope(sessions.filter((session) => session.status !== 'DRAFT').map(toStudentDto)),
    ),
  ),
  http.get(`${TEST_API_BASE_URL}/student/live-classes/:id`, ({ params }) => {
    const session = sessions.find((item) => item.id === params.id)
    if (!session)
      return HttpResponse.json(errorEnvelope('Session not found', 'NOT_FOUND'), { status: 404 })
    return HttpResponse.json(successEnvelope(toStudentDto(session)))
  }),
  http.get(`${TEST_API_BASE_URL}/student/live-classes/:id/join`, ({ params }) => {
    const session = sessions.find((item) => item.id === params.id)
    if (!session)
      return HttpResponse.json(errorEnvelope('Session not found', 'NOT_FOUND'), { status: 404 })
    const dto = toStudentDto(session)
    if (!dto.canJoin) {
      return HttpResponse.json(
        errorEnvelope('The join window for this session is not open yet', 'FORBIDDEN'),
        { status: 403 },
      )
    }
    return HttpResponse.json(
      successEnvelope({
        joinUrl: session.joinUrl,
        sessionTitle: session.title,
        startDateTime: session.startDateTime,
        endDateTime: session.endDateTime,
      }),
    )
  }),
  http.get(`${TEST_API_BASE_URL}/student/attendance`, () =>
    HttpResponse.json(
      successEnvelope({
        courses: [
          {
            courseId: 'course-1',
            courseTitle: 'Full-Stack Web Development',
            summary: {
              totalFinalizedSessions: 4,
              presentCount: 3,
              lateCount: 0,
              absentCount: 1,
              excusedCount: 0,
              attendancePercentage: 75,
            },
          },
        ],
        recentRecords: [
          {
            sessionId: 'session-past-1',
            sessionTitle: 'Week 3 — Recap',
            courseTitle: 'Full-Stack Web Development',
            batchName: 'Evening Batch — Jan 2026',
            scheduledDate: new Date(Date.now() - 86_400_000).toISOString(),
            status: 'PRESENT',
          },
        ],
      }),
    ),
  ),
]
