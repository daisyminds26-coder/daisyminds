import request from 'supertest'

import { app } from '../../src/app'
import { BatchModel, type BatchDocument, type DayOfWeek } from '../../src/models/batch.model'
import {
  LiveClassModel,
  type ILiveClass,
  type LiveClassDocument,
} from '../../src/models/live-class.model'
import { RoleModel } from '../../src/models/role.model'
import { TrainerModel } from '../../src/models/trainer.model'
import { UserModel } from '../../src/models/user.model'
import { hashPassword } from '../../src/services/password.service'
import type { LoggedInActor } from './auth'

let sequence = 0
function nextSequence(): number {
  sequence += 1
  return sequence
}

/**
 * Logs in a real TRAINER actor and links a `Trainer` profile to it — mirrors
 * `student-portal-fixtures.ts#createLoggedInStudent`. Every self-scoped
 * `/api/v1/trainer/*` route resolves identity through this link (never a
 * client-supplied `trainerId`), so trainer-ownership tests need a genuine
 * (User, Trainer) pair behind a real bearer token, not just a `TrainerModel`
 * document.
 */
export async function createLoggedInTrainer(): Promise<LoggedInActor & { trainerId: string }> {
  const n = nextSequence()
  const email = `live-class-trainer-${String(n)}@example.com`

  const role = await RoleModel.findOneAndUpdate(
    { name: 'TRAINER' },
    {
      $setOnInsert: {
        name: 'TRAINER',
        permissions: ['users:read'],
        isSystem: true,
        description: 'TRAINER role',
      },
    },
    { upsert: true, new: true },
  )

  const user = await UserModel.create({
    email,
    passwordHash: await hashPassword('correct-horse-1'),
    roleId: role._id,
    status: 'ACTIVE',
    emailVerifiedAt: new Date(),
  })

  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password: 'correct-horse-1' })

  const trainer = await TrainerModel.create({
    userId: user._id,
    trainerId: `DM-TRN-2026-${String(n).padStart(6, '0')}`,
    firstName: 'Live',
    lastName: `Trainer${String(n)}`,
    employmentStatus: 'ACTIVE',
  })

  return {
    accessToken: res.body.data.accessToken as string,
    userId: user._id.toString(),
    roleId: role._id.toString(),
    trainerId: trainer._id.toString(),
  }
}

/**
 * A `BatchModel` document with a real weekly-schedule template + date range
 * — direct model creation (bypasses `batch-management.service.ts`, same
 * precedent as `enrollment-fixtures.ts#createBatchFixture`), but this one
 * carries `weeklySchedule`/`startDate`/`endDate` since live-class
 * generation-from-timetable tests need a real template to project from.
 */
export async function createScheduledBatchFixture(
  courseId: string,
  overrides: {
    primaryTrainerId?: string
    startDate?: Date
    endDate?: Date
    timezone?: string
    weeklySchedule?: { dayOfWeek: DayOfWeek; startTime: string; endTime: string }[]
    calendarExceptions?: { date: Date; title: string }[]
  } = {},
): Promise<BatchDocument> {
  const n = nextSequence()
  return BatchModel.create({
    batchCode: `DM-BAT-2026-${String(n).padStart(6, '0')}`,
    courseId,
    name: `Live Class Fixture Batch ${String(n)}`,
    timezone: overrides.timezone ?? 'Asia/Kolkata',
    deliveryMode: 'ONLINE',
    status: 'ACTIVE',
    maxStudents: 30,
    startDate: overrides.startDate ?? new Date('2026-09-01T00:00:00.000Z'),
    endDate: overrides.endDate ?? new Date('2026-12-01T00:00:00.000Z'),
    weeklySchedule: overrides.weeklySchedule ?? [
      { dayOfWeek: 'MONDAY', startTime: '18:00', endTime: '20:00' },
    ],
    calendarExceptions: overrides.calendarExceptions ?? [],
    primaryTrainerId: overrides.primaryTrainerId ?? null,
  })
}

/**
 * A `LiveClassModel` document created directly (bypasses
 * `live-class.service.ts`) — attendance/roster/trainer-ownership tests need
 * an already-existing session in a known state, not the create flow itself.
 */
export async function createLiveClassFixture(
  batchId: string,
  courseId: string,
  overrides: Omit<Partial<ILiveClass>, 'trainerIds' | 'primaryTrainerId'> & {
    trainerIds?: string[]
    primaryTrainerId?: string | null
  } = {},
): Promise<LiveClassDocument> {
  const n = nextSequence()
  const startDateTime = overrides.startDateTime ?? new Date('2026-09-07T12:30:00.000Z')
  const endDateTime = overrides.endDateTime ?? new Date('2026-09-07T14:30:00.000Z')

  return LiveClassModel.create({
    sessionCode: `DM-CLS-2026-${String(n).padStart(6, '0')}`,
    batchId,
    courseId,
    title: overrides.title ?? 'Fixture Live Class',
    description: overrides.description ?? null,
    scheduledDate: overrides.scheduledDate ?? startDateTime,
    startDateTime,
    endDateTime,
    timezone: overrides.timezone ?? 'Asia/Kolkata',
    durationMinutes:
      overrides.durationMinutes ??
      Math.round((endDateTime.getTime() - startDateTime.getTime()) / 60_000),
    deliveryMode: overrides.deliveryMode ?? 'ONLINE',
    provider: overrides.provider ?? 'MANUAL_LINK',
    joinUrl: overrides.joinUrl ?? 'https://meet.example.com/fixture',
    hostUrl: overrides.hostUrl ?? 'https://meet.example.com/fixture/host',
    trainerIds: overrides.trainerIds ?? [],
    primaryTrainerId: overrides.primaryTrainerId ?? null,
    status: overrides.status ?? 'SCHEDULED',
    source: overrides.source ?? 'MANUAL',
    attendanceStatus: overrides.attendanceStatus ?? 'OPEN',
  })
}

export function bearer(actor: LoggedInActor): { Authorization: string } {
  return { Authorization: `Bearer ${actor.accessToken}` }
}
