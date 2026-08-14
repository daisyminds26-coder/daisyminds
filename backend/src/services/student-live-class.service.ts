import { ApiError } from '../utils/api-error'
import { resolveStudentForUser } from './student-identity.util'
import { hasLearningAccess } from './enrollment-access.service'
import { toStudentLiveClassDto, type StudentLiveClassDto } from './student-live-class-dto'
import { isLiveClassStudentVisible } from '../utils/live-class-lifecycle.util'
import { liveClassRepository } from '../repositories/live-class.repository'
import { enrollmentRepository } from '../repositories/enrollment.repository'
import { courseRepository } from '../repositories/course.repository'
import { batchRepository } from '../repositories/batch.repository'
import { trainerRepository } from '../repositories/trainer.repository'
import type { LiveClassDocument } from '../models/live-class.model'

const JOIN_WINDOW_BEFORE_MINUTES = 15
const JOIN_WINDOW_AFTER_END_MINUTES = 15
const LIST_WINDOW_DAYS_PAST = 30
const LIST_WINDOW_DAYS_FUTURE = 60

function joinWindowOpensAt(session: LiveClassDocument): Date {
  return new Date(session.startDateTime.getTime() - JOIN_WINDOW_BEFORE_MINUTES * 60_000)
}

function joinWindowClosesAt(session: LiveClassDocument): Date {
  return new Date(session.endDateTime.getTime() + JOIN_WINDOW_AFTER_END_MINUTES * 60_000)
}

/** The join window: 15 minutes before start, until session end + a 15-minute grace period — never exposed hours/days earlier (task's own explicit instruction). */
function isJoinWindowOpen(session: LiveClassDocument, now: Date): boolean {
  return now >= joinWindowOpensAt(session) && now <= joinWindowClosesAt(session)
}

/** A student may only see sessions belonging to *their own* batch for a course — a course can have several batches, and a student enrolled in one must never see another batch's sessions. */
async function assertStudentBatchAccess(
  studentId: string,
  courseId: string,
  batchId: string,
): Promise<void> {
  const enrollments = await enrollmentRepository.findAllByStudentAndBatch(studentId, batchId)
  const grantsAccess = enrollments.some(
    (enrollment) => enrollment.courseId.toString() === courseId && hasLearningAccess(enrollment),
  )
  if (!grantsAccess) throw ApiError.notFound('Session not found')
}

export const studentLiveClassService = {
  async listUpcoming(userId: string): Promise<StudentLiveClassDto[]> {
    const student = await resolveStudentForUser(userId)
    const enrollments = await enrollmentRepository.findAllByStudent(student._id.toString())
    const activeBatchIds = [
      ...new Set(
        enrollments
          .filter((enrollment) => hasLearningAccess(enrollment))
          .map((enrollment) => enrollment.batchId.toString()),
      ),
    ]
    if (activeBatchIds.length === 0) return []

    const now = new Date()
    const from = new Date(now.getTime() - LIST_WINDOW_DAYS_PAST * 86_400_000)
    const to = new Date(now.getTime() + LIST_WINDOW_DAYS_FUTURE * 86_400_000)
    const sessions = await liveClassRepository.findUpcomingForBatches(activeBatchIds, from, to)
    const visibleSessions = sessions.filter(
      (session) =>
        isLiveClassStudentVisible(session.status) ||
        session.status === 'COMPLETED' ||
        session.status === 'CANCELLED',
    )

    return buildDtos(visibleSessions, now)
  },

  async getSession(userId: string, sessionId: string): Promise<StudentLiveClassDto> {
    const student = await resolveStudentForUser(userId)
    const session = await liveClassRepository.findById(sessionId)
    // A still-being-set-up DRAFT session is never visible to a student — same 404 as "doesn't exist," never a distinguishable error.
    if (!session || session.status === 'DRAFT') throw ApiError.notFound('Session not found')

    await assertStudentBatchAccess(
      student._id.toString(),
      session.courseId.toString(),
      session.batchId.toString(),
    )

    const [dto] = await buildDtos([session], new Date())
    if (!dto) throw ApiError.notFound('Session not found')
    return dto
  },

  async getJoinDetails(
    userId: string,
    sessionId: string,
  ): Promise<{
    joinUrl: string
    sessionTitle: string
    startDateTime: string
    endDateTime: string
  }> {
    const student = await resolveStudentForUser(userId)
    const session = await liveClassRepository.findById(sessionId)
    if (!session) throw ApiError.notFound('Session not found')

    await assertStudentBatchAccess(
      student._id.toString(),
      session.courseId.toString(),
      session.batchId.toString(),
    )

    if (!isLiveClassStudentVisible(session.status)) {
      throw ApiError.forbidden('This session is not currently joinable')
    }
    if (!isJoinWindowOpen(session, new Date())) {
      throw ApiError.forbidden('The join window for this session is not open yet')
    }
    if (!session.joinUrl) {
      throw ApiError.unprocessable('No meeting link has been configured for this session')
    }

    return {
      joinUrl: session.joinUrl,
      sessionTitle: session.title,
      startDateTime: session.startDateTime.toISOString(),
      endDateTime: session.endDateTime.toISOString(),
    }
  },
}

async function buildDtos(sessions: LiveClassDocument[], now: Date): Promise<StudentLiveClassDto[]> {
  const courseIds = [...new Set(sessions.map((session) => session.courseId.toString()))]
  const batchIds = [...new Set(sessions.map((session) => session.batchId.toString()))]
  const trainerIds = [
    ...new Set(
      sessions
        .filter((session) => session.primaryTrainerId)
        .map((session) => session.primaryTrainerId?.toString() ?? ''),
    ),
  ]

  const [courses, batches, trainers] = await Promise.all([
    courseRepository.findByIds(courseIds),
    batchRepository.findByIds(batchIds),
    Promise.all(trainerIds.map((id) => trainerRepository.findById(id))),
  ])
  const courseById = new Map(courses.map((course) => [course._id.toString(), course]))
  const batchById = new Map(batches.map((batch) => [batch._id.toString(), batch]))
  const trainerById = new Map(
    trainers
      .filter((trainer): trainer is NonNullable<typeof trainer> => trainer !== null)
      .map((trainer) => [trainer._id.toString(), trainer]),
  )

  const dtos: StudentLiveClassDto[] = []
  for (const session of sessions) {
    const course = courseById.get(session.courseId.toString())
    const batch = batchById.get(session.batchId.toString())
    if (!course || !batch) continue
    const trainer = session.primaryTrainerId
      ? trainerById.get(session.primaryTrainerId.toString())
      : null
    const trainerName = trainer ? `${trainer.firstName} ${trainer.lastName}`.trim() : null
    const canJoin = isLiveClassStudentVisible(session.status) && isJoinWindowOpen(session, now)

    dtos.push(
      toStudentLiveClassDto(
        session,
        course.title,
        batch.name,
        trainerName,
        canJoin,
        joinWindowOpensAt(session),
      ),
    )
  }
  return dtos.sort((a, b) => a.startDateTime.localeCompare(b.startDateTime))
}
