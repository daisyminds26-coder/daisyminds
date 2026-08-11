import type { z } from 'zod'

import { CourseModel } from '../../src/models/course.model'
import type { DayOfWeek } from '../../src/models/batch.model'
import { RoleModel } from '../../src/models/role.model'
import { TrainerModel, type TrainerDocument } from '../../src/models/trainer.model'
import { UserModel } from '../../src/models/user.model'
import { hashPassword } from '../../src/services/password.service'
import type { createBatchSchema } from '../../src/validators/batch.validator'

type CreateBatchPayload = z.input<typeof createBatchSchema>

let sequence = 0
/** Monotonic per-test-file counter — cheap, collision-free uniqueness for fixture-generated codes/emails/ids without a real ID-generation service. */
function nextSequence(): number {
  sequence += 1
  return sequence
}

/**
 * Bypasses the course-management service (slug/courseCode generation,
 * Cloudinary-backed readiness checks) entirely — batch-management's own
 * validation only cares about a course's existence and `status`, so
 * constructing the document directly keeps batch fixtures fast and
 * independent of course-module internals.
 */
export async function createCourseFixture(
  overrides: { status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'; eligibleTrainerIds?: string[] } = {},
) {
  const n = nextSequence()
  return CourseModel.create({
    courseCode: `DM-CRS-2026-${String(n).padStart(6, '0')}`,
    title: `Fixture Course ${String(n)}`,
    slug: `fixture-course-${String(n)}`,
    category: 'Web Development',
    level: 'BEGINNER',
    deliveryMode: 'ONLINE',
    status: overrides.status ?? 'PUBLISHED',
    eligibleTrainerIds: overrides.eligibleTrainerIds ?? [],
  })
}

export async function createPublishedCourseFixture(
  overrides: { eligibleTrainerIds?: string[] } = {},
) {
  return createCourseFixture({ status: 'PUBLISHED', ...overrides })
}

export async function createDraftCourseFixture() {
  return createCourseFixture({ status: 'DRAFT' })
}

/**
 * Creates a linked (User, Trainer) pair directly via the models — mirrors
 * the shape `trainer-management.service.ts#createTrainer` produces, but
 * skips its validation/audit side effects since batch tests only need a
 * realistic, referentially-valid trainer to assign.
 */
export async function createActiveTrainerFixture(
  overrides: {
    userStatus?: 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED' | 'DEACTIVATED'
    employmentStatus?: 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE' | 'TERMINATED'
    availability?: {
      dayOfWeek: DayOfWeek
      startTime: string
      endTime: string
      timeZone: string
      type?: 'AVAILABLE' | 'PREFERRED' | 'BLOCKED'
    }[]
  } = {},
): Promise<TrainerDocument> {
  const n = nextSequence()

  const role = await RoleModel.findOneAndUpdate(
    { name: 'TRAINER' },
    {
      $setOnInsert: {
        name: 'TRAINER',
        permissions: [],
        isSystem: true,
        description: 'TRAINER role',
      },
    },
    { upsert: true, new: true },
  )

  const user = await UserModel.create({
    email: `fixture-trainer-${String(n)}@example.com`,
    passwordHash: await hashPassword('correct-horse-1'),
    roleId: role._id,
    status: overrides.userStatus ?? 'ACTIVE',
    emailVerifiedAt: new Date(),
  })

  return TrainerModel.create({
    userId: user._id,
    trainerId: `DM-TRN-2026-${String(n).padStart(6, '0')}`,
    firstName: 'Fixture',
    lastName: `Trainer${String(n)}`,
    employmentStatus: overrides.employmentStatus ?? 'ACTIVE',
    availability: overrides.availability ?? [],
  })
}

/** A minimal, always-valid `POST /batches` body — every test builds on top of this via overrides. */
export function validCreateBatchPayload(
  courseId: string,
  overrides: Partial<CreateBatchPayload> = {},
): CreateBatchPayload {
  return {
    courseId,
    name: 'August 2026 Morning',
    timezone: 'Asia/Kolkata',
    deliveryMode: 'ONLINE',
    maxStudents: 30,
    ...overrides,
  }
}

/** A payload with every field a batch needs to pass the scheduling-readiness check (published course, active/eligible trainer, a weekly schedule spanning >= 7 days, no location needed for ONLINE). */
export function readyToScheduleBatchPayload(
  courseId: string,
  primaryTrainerId: string,
  overrides: Partial<CreateBatchPayload> = {},
): CreateBatchPayload {
  return validCreateBatchPayload(courseId, {
    startDate: new Date('2026-09-01'),
    endDate: new Date('2026-10-01'),
    primaryTrainerId,
    weeklySchedule: [{ dayOfWeek: 'MONDAY', startTime: '18:00', endTime: '20:00' }],
    ...overrides,
  })
}
