import { http, HttpResponse } from 'msw'

import { TEST_API_BASE_URL } from '@/test/api-base-url'
import type { AdminStudent, AdminStudentListItem } from '@/features/students/types'

/** Mirrors `backend/src/services/student-management.service.ts`'s DTO shapes and behavior for the endpoints the frontend actually calls. */

let students: AdminStudent[] = []
let idCounter = 0

function seedDefaultStudents(): void {
  idCounter = 0
  students = [
    makeStudent({
      email: 'active-student@example.com',
      firstName: 'Priya',
      lastName: 'Sharma',
      status: 'ACTIVE',
    }),
    makeStudent({
      email: 'pending-student@example.com',
      firstName: 'Rahul',
      lastName: 'Verma',
      status: 'PENDING_VERIFICATION',
    }),
  ]
}

function makeStudent(
  overrides: Partial<AdminStudent> & Pick<AdminStudent, 'email' | 'firstName' | 'lastName'>,
): AdminStudent {
  idCounter += 1
  const now = new Date().toISOString()
  return {
    id: `student-${idCounter.toString()}`,
    userId: `user-${idCounter.toString()}`,
    studentId: `DM-STU-2026-${idCounter.toString().padStart(6, '0')}`,
    status: overrides.status ?? 'ACTIVE',
    isDeleted: false,
    emailVerifiedAt: overrides.status === 'PENDING_VERIFICATION' ? null : now,
    lastLoginAt: null,
    middleName: null,
    displayName: null,
    dateOfBirth: '2005-01-01T00:00:00.000Z',
    gender: null,
    preferredLanguage: null,
    phone: '+91 98765 43210',
    alternatePhone: null,
    address: {
      line1: '221B Baker Street',
      line2: null,
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560001',
      country: 'India',
    },
    emergencyContacts: [
      {
        name: 'Test Contact',
        phone: '+91 98765 00000',
        relationship: 'Parent',
        alternatePhone: null,
        email: null,
      },
    ],
    guardianName: null,
    guardianPhone: null,
    guardianEmail: null,
    guardianRelationship: null,
    guardianOccupation: null,
    guardianAddressSameAsStudent: false,
    guardianAddress: null,
    educationRecords: [],
    profilePhotoUrl: null,
    profilePhotoPublicId: null,
    admissionDate: now,
    source: null,
    counsellorId: null,
    notes: null,
    tags: [],
    profileCompletionPercentage: 40,
    profileCompletionStatus: 'PARTIAL',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function toListItem(student: AdminStudent): AdminStudentListItem {
  return {
    id: student.id,
    userId: student.userId,
    studentId: student.studentId,
    email: student.email,
    status: student.status,
    isDeleted: student.isDeleted,
    firstName: student.firstName,
    lastName: student.lastName,
    middleName: student.middleName,
    displayName: student.displayName,
    phone: student.phone,
    address: student.address,
    admissionDate: student.admissionDate,
    gender: student.gender,
    source: student.source,
    tags: student.tags,
    profileCompletionPercentage: student.profileCompletionPercentage,
    profileCompletionStatus: student.profileCompletionStatus,
    profilePhotoUrl: student.profilePhotoUrl,
    createdAt: student.createdAt,
    updatedAt: student.updatedAt,
  }
}

export function resetStudentsMockState(): void {
  seedDefaultStudents()
}

/** Cross-handler accessor, mirrors `courses.handlers.ts`'s `findCourseById` — lets `enrollments.handlers.ts` compose student summaries without duplicating student mock data. */
export function findStudentById(studentId: string): AdminStudent | undefined {
  return students.find((student) => student.id === studentId)
}

seedDefaultStudents()

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

export const studentsHandlers = [
  http.get(`${TEST_API_BASE_URL}/students`, ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? '1')
    const limit = Number(url.searchParams.get('limit') ?? '20')
    const search = url.searchParams.get('search')
    const status = url.searchParams.get('status')

    let filtered = students
    if (search) {
      filtered = filtered.filter(
        (student) =>
          student.firstName.toLowerCase().includes(search.toLowerCase()) ||
          student.email.startsWith(search),
      )
    }
    if (status) filtered = filtered.filter((student) => student.status === status)

    const start = (page - 1) * limit
    const pageItems = filtered.slice(start, start + limit).map(toListItem)
    return HttpResponse.json(paginatedEnvelope(pageItems, page, limit, filtered.length))
  }),

  http.post(`${TEST_API_BASE_URL}/students`, async ({ request }) => {
    const body = (await request.json()) as {
      email: string
      firstName: string
      lastName: string
      sendInvitation?: boolean
    }
    if (students.some((student) => student.email === body.email)) {
      return HttpResponse.json(errorEnvelope('A user with this email already exists', 'CONFLICT'), {
        status: 409,
      })
    }
    const created = makeStudent({
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      status: body.sendInvitation === false ? 'ACTIVE' : 'PENDING_VERIFICATION',
    })
    students.push(created)
    return HttpResponse.json(successEnvelope(created, 'Student created'), { status: 201 })
  }),

  http.get(`${TEST_API_BASE_URL}/students/:id`, ({ params }) => {
    const student = students.find((candidate) => candidate.id === params.id)
    if (!student) {
      return HttpResponse.json(errorEnvelope('Student not found', 'NOT_FOUND'), { status: 404 })
    }
    return HttpResponse.json(successEnvelope(student))
  }),

  http.patch(`${TEST_API_BASE_URL}/students/:id`, async ({ params, request }) => {
    const student = students.find((candidate) => candidate.id === params.id)
    if (!student) {
      return HttpResponse.json(errorEnvelope('Student not found', 'NOT_FOUND'), { status: 404 })
    }
    const body = (await request.json()) as Partial<AdminStudent>
    Object.assign(student, body)
    return HttpResponse.json(successEnvelope(student, 'Student updated'))
  }),

  http.post(`${TEST_API_BASE_URL}/students/:id/activate`, ({ params }) => {
    const student = students.find((candidate) => candidate.id === params.id)
    if (!student) {
      return HttpResponse.json(errorEnvelope('Student not found', 'NOT_FOUND'), { status: 404 })
    }
    student.status = 'ACTIVE'
    return HttpResponse.json(successEnvelope(student, 'Student activated'))
  }),

  http.post(`${TEST_API_BASE_URL}/students/:id/deactivate`, ({ params }) => {
    const student = students.find((candidate) => candidate.id === params.id)
    if (!student) {
      return HttpResponse.json(errorEnvelope('Student not found', 'NOT_FOUND'), { status: 404 })
    }
    student.status = 'DEACTIVATED'
    return HttpResponse.json(successEnvelope(student, 'Student deactivated'))
  }),

  http.delete(`${TEST_API_BASE_URL}/students/:id`, ({ params }) => {
    const student = students.find((candidate) => candidate.id === params.id)
    if (!student) {
      return HttpResponse.json(errorEnvelope('Student not found', 'NOT_FOUND'), { status: 404 })
    }
    student.isDeleted = true
    return HttpResponse.json(successEnvelope(null, 'Student deleted'))
  }),

  http.post(`${TEST_API_BASE_URL}/students/:id/restore`, ({ params }) => {
    const student = students.find((candidate) => candidate.id === params.id)
    if (!student) {
      return HttpResponse.json(errorEnvelope('Student not found', 'NOT_FOUND'), { status: 404 })
    }
    student.isDeleted = false
    return HttpResponse.json(successEnvelope(student, 'Student restored'))
  }),

  http.post(`${TEST_API_BASE_URL}/students/:id/resend-invitation`, ({ params }) => {
    const student = students.find((candidate) => candidate.id === params.id)
    if (!student) {
      return HttpResponse.json(errorEnvelope('Student not found', 'NOT_FOUND'), { status: 404 })
    }
    return HttpResponse.json(successEnvelope(null, 'Invitation email sent'))
  }),

  http.post(`${TEST_API_BASE_URL}/students/bulk`, async ({ request }) => {
    const body = (await request.json()) as {
      action: 'activate' | 'deactivate' | 'delete' | 'restore'
      studentIds: string[]
    }
    const succeeded: string[] = []
    const failed: { id: string; reason: string }[] = []

    for (const id of body.studentIds) {
      const student = students.find((candidate) => candidate.id === id)
      if (!student) {
        failed.push({ id, reason: 'Student not found' })
        continue
      }
      if (body.action === 'activate') student.status = 'ACTIVE'
      else if (body.action === 'deactivate') student.status = 'DEACTIVATED'
      else if (body.action === 'restore') student.isDeleted = false
      else student.isDeleted = true
      succeeded.push(id)
    }

    return HttpResponse.json(successEnvelope({ succeeded, failed }, 'Bulk action completed'))
  }),

  http.get(`${TEST_API_BASE_URL}/students/:id/sessions`, () =>
    HttpResponse.json(successEnvelope([])),
  ),

  http.get(`${TEST_API_BASE_URL}/students/:id/audit-log`, () =>
    HttpResponse.json(paginatedEnvelope([], 1, 20, 0)),
  ),
]
