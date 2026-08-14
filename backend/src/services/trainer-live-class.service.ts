import { ApiError } from '../utils/api-error'
import { resolveTrainerForUser } from './trainer-identity.util'
import { liveClassService } from './live-class.service'
import { attendanceService } from './attendance.service'
import { toAdminLiveClassDto, type AdminLiveClassDto } from './live-class-dto'
import type { SessionAttendanceDto } from './attendance-dto'
import {
  liveClassRepository,
  type ListLiveClassesFilter,
} from '../repositories/live-class.repository'
import { courseRepository } from '../repositories/course.repository'
import { batchRepository } from '../repositories/batch.repository'
import { trainerRepository } from '../repositories/trainer.repository'
import type { LiveClassDocument } from '../models/live-class.model'
import type { AttendanceStatus } from '../models/attendance.model'
import type { AuthenticatedUser } from '../types/auth'
import type { RequestContext } from './user-management.service'

/** A trainer may only ever act on a session they're assigned to (`primaryTrainerId` or a member of `trainerIds`) — never arbitrary batch/session access (task's own explicit instruction). Not found, not forbidden, for anything else: no existence disclosure. */
async function requireOwnedSession(
  trainerId: string,
  sessionId: string,
): Promise<LiveClassDocument> {
  const session = await liveClassRepository.findById(sessionId)
  const isAssigned =
    session?.primaryTrainerId?.toString() === trainerId ||
    (session?.trainerIds.some((id) => id.toString() === trainerId) ?? false)
  if (!session || !isAssigned) throw ApiError.notFound('Session not found')
  return session
}

async function toDto(session: LiveClassDocument): Promise<AdminLiveClassDto> {
  const [course, batch, trainers] = await Promise.all([
    courseRepository.findById(session.courseId.toString()),
    batchRepository.findById(session.batchId.toString()),
    Promise.all(session.trainerIds.map((id) => trainerRepository.findById(id.toString()))),
  ])
  if (!course || !batch) throw ApiError.notFound('Session not found')
  const trainerById = new Map(
    trainers
      .filter((trainer): trainer is NonNullable<typeof trainer> => trainer !== null)
      .map((trainer) => [trainer._id.toString(), trainer]),
  )
  return toAdminLiveClassDto(session, course, batch, trainerById)
}

export const trainerLiveClassService = {
  async listMySessions(
    userId: string,
    filter: Omit<ListLiveClassesFilter, 'trainerId'>,
  ): Promise<AdminLiveClassDto[]> {
    const trainer = await resolveTrainerForUser(userId)
    const sessions = await liveClassRepository.findForTrainer(trainer._id.toString(), filter)
    return Promise.all(sessions.map((session) => toDto(session)))
  },

  async getMySession(userId: string, sessionId: string): Promise<AdminLiveClassDto> {
    const trainer = await resolveTrainerForUser(userId)
    const session = await requireOwnedSession(trainer._id.toString(), sessionId)
    return toDto(session)
  },

  async startMySession(
    userId: string,
    sessionId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminLiveClassDto> {
    const trainer = await resolveTrainerForUser(userId)
    await requireOwnedSession(trainer._id.toString(), sessionId)
    return liveClassService.transition(sessionId, 'LIVE', actor, context)
  },

  async completeMySession(
    userId: string,
    sessionId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminLiveClassDto> {
    const trainer = await resolveTrainerForUser(userId)
    await requireOwnedSession(trainer._id.toString(), sessionId)
    return liveClassService.transition(sessionId, 'COMPLETED', actor, context)
  },

  async getMySessionAttendance(userId: string, sessionId: string): Promise<SessionAttendanceDto> {
    const trainer = await resolveTrainerForUser(userId)
    await requireOwnedSession(trainer._id.toString(), sessionId)
    return attendanceService.getSessionRoster(sessionId)
  },

  async markMySessionAttendance(
    userId: string,
    sessionId: string,
    records: { studentId: string; status: AttendanceStatus; notes?: string }[],
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<{ roster: SessionAttendanceDto; rejected: { studentId: string; reason: string }[] }> {
    const trainer = await resolveTrainerForUser(userId)
    await requireOwnedSession(trainer._id.toString(), sessionId)
    return attendanceService.bulkMarkAttendance(sessionId, records, actor, context)
  },
}
