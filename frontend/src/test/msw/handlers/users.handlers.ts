import { http, HttpResponse } from 'msw'

import { TEST_API_BASE_URL } from '@/test/api-base-url'
import type { AdminUser } from '@/features/users/types'

/** Mirrors `backend/src/services/user-management.service.ts`'s DTO shapes and behavior for the endpoints the frontend actually calls. */

const ROLE_OPTIONS = [
  { id: 'role-super-admin', name: 'SUPER_ADMIN' },
  { id: 'role-admin', name: 'ADMIN' },
  { id: 'role-trainer', name: 'TRAINER' },
  { id: 'role-student', name: 'STUDENT' },
] as const

let users: AdminUser[] = []
let idCounter = 0

function seedDefaultUsers(): void {
  idCounter = 0
  users = [
    makeUser({
      email: 'active@example.com',
      role: 'STUDENT',
      roleId: 'role-student',
      status: 'ACTIVE',
    }),
    makeUser({
      email: 'pending@example.com',
      role: 'STUDENT',
      roleId: 'role-student',
      status: 'PENDING_VERIFICATION',
    }),
  ]
}

function makeUser(
  overrides: Partial<AdminUser> & Pick<AdminUser, 'email' | 'role' | 'roleId'>,
): AdminUser {
  idCounter += 1
  const now = new Date().toISOString()
  return {
    id: `user-${idCounter.toString()}`,
    email: overrides.email,
    role: overrides.role,
    roleId: overrides.roleId,
    status: overrides.status ?? 'ACTIVE',
    mfaEnabled: false,
    lastLoginAt: null,
    lastLoginIp: null,
    emailVerifiedAt: overrides.status === 'PENDING_VERIFICATION' ? null : now,
    isDeleted: false,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  }
}

export function resetUsersMockState(): void {
  seedDefaultUsers()
}

seedDefaultUsers()

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

export const usersHandlers = [
  http.get(`${TEST_API_BASE_URL}/roles`, () => HttpResponse.json(successEnvelope(ROLE_OPTIONS))),

  http.get(`${TEST_API_BASE_URL}/users`, ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? '1')
    const limit = Number(url.searchParams.get('limit') ?? '20')
    const search = url.searchParams.get('search')
    const status = url.searchParams.get('status')

    let filtered = users
    if (search) filtered = filtered.filter((user) => user.email.startsWith(search))
    if (status) filtered = filtered.filter((user) => user.status === status)

    const start = (page - 1) * limit
    const pageItems = filtered.slice(start, start + limit)
    return HttpResponse.json(paginatedEnvelope(pageItems, page, limit, filtered.length))
  }),

  http.post(`${TEST_API_BASE_URL}/users`, async ({ request }) => {
    const body = (await request.json()) as {
      email: string
      roleId: string
      sendVerificationEmail: boolean
    }
    if (users.some((user) => user.email === body.email)) {
      return HttpResponse.json(errorEnvelope('A user with this email already exists', 'CONFLICT'), {
        status: 409,
      })
    }
    const role = ROLE_OPTIONS.find((option) => option.id === body.roleId)
    const created = makeUser({
      email: body.email,
      role: role?.name ?? 'STUDENT',
      roleId: body.roleId,
      status: body.sendVerificationEmail ? 'PENDING_VERIFICATION' : 'ACTIVE',
    })
    users.push(created)
    return HttpResponse.json(successEnvelope(created, 'User created'), { status: 201 })
  }),

  http.get(`${TEST_API_BASE_URL}/users/:id`, ({ params }) => {
    const user = users.find((candidate) => candidate.id === params.id)
    if (!user) {
      return HttpResponse.json(errorEnvelope('User not found', 'NOT_FOUND'), { status: 404 })
    }
    return HttpResponse.json(successEnvelope(user))
  }),

  http.post(`${TEST_API_BASE_URL}/users/:id/deactivate`, ({ params }) => {
    const user = users.find((candidate) => candidate.id === params.id)
    if (!user) {
      return HttpResponse.json(errorEnvelope('User not found', 'NOT_FOUND'), { status: 404 })
    }
    user.status = 'DEACTIVATED'
    return HttpResponse.json(successEnvelope(user, 'User deactivated'))
  }),

  http.post(`${TEST_API_BASE_URL}/users/:id/activate`, ({ params }) => {
    const user = users.find((candidate) => candidate.id === params.id)
    if (!user) {
      return HttpResponse.json(errorEnvelope('User not found', 'NOT_FOUND'), { status: 404 })
    }
    user.status = 'ACTIVE'
    return HttpResponse.json(successEnvelope(user, 'User activated'))
  }),

  http.delete(`${TEST_API_BASE_URL}/users/:id`, ({ params }) => {
    const user = users.find((candidate) => candidate.id === params.id)
    if (!user) {
      return HttpResponse.json(errorEnvelope('User not found', 'NOT_FOUND'), { status: 404 })
    }
    user.isDeleted = true
    return HttpResponse.json(successEnvelope(null, 'User deleted'))
  }),

  http.patch(`${TEST_API_BASE_URL}/users/:id/role`, async ({ params, request }) => {
    const body = (await request.json()) as { roleId: string }
    const user = users.find((candidate) => candidate.id === params.id)
    if (!user) {
      return HttpResponse.json(errorEnvelope('User not found', 'NOT_FOUND'), { status: 404 })
    }
    const role = ROLE_OPTIONS.find((option) => option.id === body.roleId)
    if (!role) {
      return HttpResponse.json(errorEnvelope('Role not found', 'BAD_REQUEST'), { status: 400 })
    }
    user.roleId = role.id
    user.role = role.name
    return HttpResponse.json(successEnvelope(user, 'Role assigned'))
  }),

  http.post(`${TEST_API_BASE_URL}/users/bulk`, async ({ request }) => {
    const body = (await request.json()) as {
      action: 'activate' | 'deactivate' | 'delete'
      userIds: string[]
    }
    const succeeded: string[] = []
    const failed: { id: string; reason: string }[] = []

    for (const id of body.userIds) {
      const user = users.find((candidate) => candidate.id === id)
      if (!user) {
        failed.push({ id, reason: 'User not found' })
        continue
      }
      if (body.action === 'activate') user.status = 'ACTIVE'
      else if (body.action === 'deactivate') user.status = 'DEACTIVATED'
      else user.isDeleted = true
      succeeded.push(id)
    }

    return HttpResponse.json(successEnvelope({ succeeded, failed }, 'Bulk action completed'))
  }),
]
