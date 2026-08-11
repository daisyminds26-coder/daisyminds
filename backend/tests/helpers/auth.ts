import request from 'supertest'

import { app } from '../../src/app'
import type { SystemRoleName } from '../../src/models/role.model'
import { createTestRole, createTestUser } from './seed'

const DEFAULT_PASSWORD = 'correct-horse-1'

/**
 * Mirrors `scripts/seed-roles.ts`'s real permission grants so tests exercise
 * the same permission shape production roles actually have.
 */
const DEFAULT_PERMISSIONS: Record<SystemRoleName, string[]> = {
  SUPER_ADMIN: [
    'users:read',
    'users:manage',
    'roles:manage',
    'audit-logs:read',
    'settings:manage',
    'students:read',
    'students:manage',
    'students:export',
    'trainers:read',
    'trainers:manage',
    'trainers:export',
    'dashboard:read',
    'courses:read',
    'courses:manage',
    'courses:publish',
    'courses:export',
    'batches:read',
    'batches:manage',
    'batches:export',
    'enrollments:read',
    'enrollments:manage',
    'enrollments:export',
  ],
  ADMIN: [
    'users:read',
    'users:manage',
    'audit-logs:read',
    'students:read',
    'students:manage',
    'students:export',
    'trainers:read',
    'trainers:manage',
    'trainers:export',
    'dashboard:read',
    'courses:read',
    'courses:manage',
    'courses:publish',
    'courses:export',
    'batches:read',
    'batches:manage',
    'batches:export',
    'enrollments:read',
    'enrollments:manage',
    'enrollments:export',
  ],
  TRAINER: ['users:read'],
  STUDENT: [],
}

export interface LoggedInActor {
  accessToken: string
  userId: string
  roleId: string
}

/** Creates a role (if `permissions` isn't given, uses the same grants `seed-roles.ts` seeds) + a user + logs in, returning a bearer token ready to use. */
export async function loginAs(options: {
  email: string
  role: SystemRoleName
  permissions?: string[]
  password?: string
}): Promise<LoggedInActor> {
  const password = options.password ?? DEFAULT_PASSWORD
  const role = await createTestRole(
    options.role,
    options.permissions ?? DEFAULT_PERMISSIONS[options.role],
  )
  const user = await createTestUser({ email: options.email, password, roleId: role._id.toString() })

  const res = await request(app).post('/api/v1/auth/login').send({ email: options.email, password })

  return {
    accessToken: res.body.data.accessToken as string,
    userId: user._id.toString(),
    roleId: role._id.toString(),
  }
}
