import { http, HttpResponse } from 'msw'

import { TEST_API_BASE_URL } from '@/test/api-base-url'
import type { AdminTrainer, AdminTrainerListItem } from '@/features/trainers/types'

/** Mirrors `backend/src/services/trainer-management.service.ts`'s DTO shapes and behavior for the endpoints the frontend actually calls. */

let trainers: AdminTrainer[] = []
let idCounter = 0

function seedDefaultTrainers(): void {
  idCounter = 0
  trainers = [
    makeTrainer({
      email: 'active-trainer@example.com',
      firstName: 'Arjun',
      lastName: 'Mehta',
      status: 'ACTIVE',
    }),
    makeTrainer({
      email: 'pending-trainer@example.com',
      firstName: 'Divya',
      lastName: 'Nair',
      status: 'PENDING_VERIFICATION',
    }),
  ]
}

function makeTrainer(
  overrides: Partial<AdminTrainer> & Pick<AdminTrainer, 'email' | 'firstName' | 'lastName'>,
): AdminTrainer {
  idCounter += 1
  const now = new Date().toISOString()
  return {
    id: `trainer-${idCounter.toString()}`,
    userId: `user-${idCounter.toString()}`,
    trainerId: `DM-TRN-2026-${idCounter.toString().padStart(6, '0')}`,
    status: overrides.status ?? 'ACTIVE',
    isDeleted: false,
    emailVerifiedAt: overrides.status === 'PENDING_VERIFICATION' ? null : now,
    lastLoginAt: null,
    middleName: null,
    displayName: null,
    dateOfBirth: null,
    gender: null,
    preferredLanguage: null,
    bio: '',
    phone: '+91 98765 12345',
    alternatePhone: null,
    address: null,
    emergencyContacts: [],
    designation: 'Senior Trainer',
    department: 'Engineering',
    totalYearsExperience: 5,
    teachingYearsExperience: 3,
    industryYearsExperience: 5,
    expertiseAreas: ['React'],
    secondaryExpertise: [],
    skills: [],
    technologies: [],
    specializations: [],
    linkedinUrl: null,
    portfolioUrl: null,
    githubUrl: null,
    websiteUrl: null,
    qualifications: [],
    certifications: [],
    joiningDate: now,
    employmentType: 'FULL_TIME',
    employmentStatus: 'ACTIVE',
    employeeCode: null,
    reportingManagerId: null,
    workLocation: null,
    probationEndDate: null,
    noticePeriodDays: null,
    preferredTeachingModes: [],
    preferredTimeSlots: [],
    maxConcurrentBatches: null,
    maxWeeklyTeachingHours: null,
    availabilityStatus: 'AVAILABLE',
    availabilityNotes: null,
    languagesOfInstruction: [],
    teachingLevel: null,
    qualifiedToTeachSubjects: [],
    availability: [],
    documents: [],
    profilePhotoUrl: null,
    profilePhotoPublicId: null,
    source: null,
    notes: null,
    tags: [],
    profileCompletionPercentage: 43,
    profileCompletionStatus: 'PARTIAL',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function toListItem(trainer: AdminTrainer): AdminTrainerListItem {
  return {
    id: trainer.id,
    userId: trainer.userId,
    trainerId: trainer.trainerId,
    email: trainer.email,
    status: trainer.status,
    isDeleted: trainer.isDeleted,
    firstName: trainer.firstName,
    lastName: trainer.lastName,
    middleName: trainer.middleName,
    displayName: trainer.displayName,
    designation: trainer.designation,
    department: trainer.department,
    expertiseAreas: trainer.expertiseAreas,
    totalYearsExperience: trainer.totalYearsExperience,
    employmentType: trainer.employmentType,
    employmentStatus: trainer.employmentStatus,
    availabilityStatus: trainer.availabilityStatus,
    profileCompletionPercentage: trainer.profileCompletionPercentage,
    profileCompletionStatus: trainer.profileCompletionStatus,
    profilePhotoUrl: trainer.profilePhotoUrl,
    createdAt: trainer.createdAt,
    updatedAt: trainer.updatedAt,
  }
}

export function resetTrainersMockState(): void {
  seedDefaultTrainers()
}

seedDefaultTrainers()

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

export const trainersHandlers = [
  http.get(`${TEST_API_BASE_URL}/trainers`, ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? '1')
    const limit = Number(url.searchParams.get('limit') ?? '20')
    const search = url.searchParams.get('search')
    const status = url.searchParams.get('status')

    let filtered = trainers
    if (search) {
      filtered = filtered.filter(
        (trainer) =>
          trainer.firstName.toLowerCase().includes(search.toLowerCase()) ||
          trainer.email.startsWith(search),
      )
    }
    if (status) filtered = filtered.filter((trainer) => trainer.status === status)

    const start = (page - 1) * limit
    const pageItems = filtered.slice(start, start + limit).map(toListItem)
    return HttpResponse.json(paginatedEnvelope(pageItems, page, limit, filtered.length))
  }),

  http.post(`${TEST_API_BASE_URL}/trainers`, async ({ request }) => {
    const body = (await request.json()) as {
      email: string
      firstName: string
      lastName: string
      sendInvitation?: boolean
    }
    if (trainers.some((trainer) => trainer.email === body.email)) {
      return HttpResponse.json(errorEnvelope('A user with this email already exists', 'CONFLICT'), {
        status: 409,
      })
    }
    const created = makeTrainer({
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      status: body.sendInvitation === false ? 'ACTIVE' : 'PENDING_VERIFICATION',
    })
    trainers.push(created)
    return HttpResponse.json(successEnvelope(created, 'Trainer created'), { status: 201 })
  }),

  http.get(`${TEST_API_BASE_URL}/trainers/:id`, ({ params }) => {
    const trainer = trainers.find((candidate) => candidate.id === params.id)
    if (!trainer) {
      return HttpResponse.json(errorEnvelope('Trainer not found', 'NOT_FOUND'), { status: 404 })
    }
    return HttpResponse.json(successEnvelope(trainer))
  }),

  http.patch(`${TEST_API_BASE_URL}/trainers/:id`, async ({ params, request }) => {
    const trainer = trainers.find((candidate) => candidate.id === params.id)
    if (!trainer) {
      return HttpResponse.json(errorEnvelope('Trainer not found', 'NOT_FOUND'), { status: 404 })
    }
    const body = (await request.json()) as Partial<AdminTrainer>
    Object.assign(trainer, body)
    return HttpResponse.json(successEnvelope(trainer, 'Trainer updated'))
  }),

  http.post(`${TEST_API_BASE_URL}/trainers/:id/activate`, ({ params }) => {
    const trainer = trainers.find((candidate) => candidate.id === params.id)
    if (!trainer) {
      return HttpResponse.json(errorEnvelope('Trainer not found', 'NOT_FOUND'), { status: 404 })
    }
    trainer.status = 'ACTIVE'
    return HttpResponse.json(successEnvelope(trainer, 'Trainer activated'))
  }),

  http.post(`${TEST_API_BASE_URL}/trainers/:id/deactivate`, ({ params }) => {
    const trainer = trainers.find((candidate) => candidate.id === params.id)
    if (!trainer) {
      return HttpResponse.json(errorEnvelope('Trainer not found', 'NOT_FOUND'), { status: 404 })
    }
    trainer.status = 'DEACTIVATED'
    return HttpResponse.json(successEnvelope(trainer, 'Trainer deactivated'))
  }),

  http.delete(`${TEST_API_BASE_URL}/trainers/:id`, ({ params }) => {
    const trainer = trainers.find((candidate) => candidate.id === params.id)
    if (!trainer) {
      return HttpResponse.json(errorEnvelope('Trainer not found', 'NOT_FOUND'), { status: 404 })
    }
    trainer.isDeleted = true
    return HttpResponse.json(successEnvelope(null, 'Trainer deleted'))
  }),

  http.post(`${TEST_API_BASE_URL}/trainers/:id/restore`, ({ params }) => {
    const trainer = trainers.find((candidate) => candidate.id === params.id)
    if (!trainer) {
      return HttpResponse.json(errorEnvelope('Trainer not found', 'NOT_FOUND'), { status: 404 })
    }
    trainer.isDeleted = false
    return HttpResponse.json(successEnvelope(trainer, 'Trainer restored'))
  }),

  http.post(`${TEST_API_BASE_URL}/trainers/:id/resend-invitation`, ({ params }) => {
    const trainer = trainers.find((candidate) => candidate.id === params.id)
    if (!trainer) {
      return HttpResponse.json(errorEnvelope('Trainer not found', 'NOT_FOUND'), { status: 404 })
    }
    return HttpResponse.json(successEnvelope(null, 'Invitation email sent'))
  }),

  http.post(`${TEST_API_BASE_URL}/trainers/bulk`, async ({ request }) => {
    const body = (await request.json()) as {
      action: 'activate' | 'deactivate' | 'delete' | 'restore'
      trainerIds: string[]
    }
    const succeeded: string[] = []
    const failed: { id: string; reason: string }[] = []

    for (const id of body.trainerIds) {
      const trainer = trainers.find((candidate) => candidate.id === id)
      if (!trainer) {
        failed.push({ id, reason: 'Trainer not found' })
        continue
      }
      if (body.action === 'activate') trainer.status = 'ACTIVE'
      else if (body.action === 'deactivate') trainer.status = 'DEACTIVATED'
      else if (body.action === 'restore') trainer.isDeleted = false
      else trainer.isDeleted = true
      succeeded.push(id)
    }

    return HttpResponse.json(successEnvelope({ succeeded, failed }, 'Bulk action completed'))
  }),

  http.get(`${TEST_API_BASE_URL}/trainers/:id/sessions`, () =>
    HttpResponse.json(successEnvelope([])),
  ),

  http.get(`${TEST_API_BASE_URL}/trainers/:id/audit-log`, () =>
    HttpResponse.json(paginatedEnvelope([], 1, 20, 0)),
  ),
]
