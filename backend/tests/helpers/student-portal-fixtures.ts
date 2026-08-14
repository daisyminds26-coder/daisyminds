import request from 'supertest'

import { app } from '../../src/app'
import { EnrollmentModel, type EnrollmentStatus } from '../../src/models/enrollment.model'
import { StudentModel } from '../../src/models/student.model'
import type { LoggedInActor } from './auth'
import { ensureTestRole, createTestUser } from './seed'

const DEFAULT_PASSWORD = 'correct-horse-1'

let sequence = 0
function nextSequence(): number {
  sequence += 1
  return sequence
}

/**
 * Logs in a real STUDENT actor and links a `Student` profile to it — every
 * self-scoped student route resolves identity through this link. Shared by
 * the Phase 11A portal tests and the Phase 11B learning-player tests.
 *
 * Deliberately does not call `loginAs()` (which internally does a plain,
 * non-idempotent `createTestRole`) — a test that needs two students (e.g.
 * an isolation/IDOR test) calls this twice, and a second plain
 * `RoleModel.create({name: 'STUDENT'})` would violate the unique index on
 * `roles.name`. `ensureTestRole` upserts instead, so this is safe to call
 * any number of times within one test.
 */
export async function createLoggedInStudent(): Promise<LoggedInActor & { studentId: string }> {
  const n = nextSequence()
  const email = `student-portal-${String(n)}@example.com`
  const role = await ensureTestRole('STUDENT', [])
  const user = await createTestUser({
    email,
    password: DEFAULT_PASSWORD,
    roleId: role._id.toString(),
  })

  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password: DEFAULT_PASSWORD })

  const student = await StudentModel.create({
    userId: user._id,
    studentId: `DM-STU-2026-${String(n).padStart(6, '0')}`,
    firstName: 'Portal',
    lastName: `Student${String(n)}`,
  })

  return {
    accessToken: res.body.data.accessToken as string,
    userId: user._id.toString(),
    roleId: role._id.toString(),
    studentId: student._id.toString(),
  }
}

export function createEnrollment(
  studentId: string,
  courseId: string,
  batchId: string,
  overrides: Partial<{
    status: EnrollmentStatus
    accessStartsAt: Date | null
    accessEndsAt: Date | null
  }> = {},
) {
  const n = nextSequence()
  return EnrollmentModel.create({
    enrollmentCode: `DM-ENR-2026-${String(n).padStart(6, '0')}`,
    studentId,
    courseId,
    batchId,
    status: overrides.status ?? 'ACTIVE',
    accessStartsAt: overrides.accessStartsAt ?? null,
    accessEndsAt: overrides.accessEndsAt ?? null,
  })
}

export function bearer(actor: LoggedInActor): { Authorization: string } {
  return { Authorization: `Bearer ${actor.accessToken}` }
}
