import { ApiError } from '../utils/api-error'
import {
  generateUpcomingOccurrences,
  dateKeyInTimezone,
  dayOfWeekInTimezone,
  type ScheduleOccurrence,
} from '../utils/schedule-occurrence.util'
import { utcToWallTime } from '../utils/zoned-datetime.util'
import { generateSignedDeliveryUrl } from './media-delivery.service'
import { calculateProfileCompletion } from './student-management.service'
import {
  computeEnrollmentAccessState,
  hasLearningAccess,
  enrollmentAccessService,
} from './enrollment-access.service'
import {
  toBatchSummaryDto,
  toEnrollmentDto,
  toLessonDto,
  toModuleDto,
  toProfileDto,
  toResourceDto,
  toTrainerSummaryDto,
  type StudentCourseDetailDto,
  type StudentDashboardDto,
  type StudentEnrollmentDto,
  type StudentProfileDto,
  type StudentResourceDto,
} from './student-portal-dto'
import type { RequestContext } from './user-management.service'
import { resolveStudentForUser } from './student-identity.util'
import { computeCourseProgressForStudent } from './student-learning.service'
import { isLessonUnlocked } from '../utils/prerequisite-lock.util'
import type { CourseProgressSummary } from '../utils/course-progress.util'
import { liveClassRepository } from '../repositories/live-class.repository'
import { studentRepository } from '../repositories/student.repository'
import { userRepository } from '../repositories/user.repository'
import { enrollmentRepository } from '../repositories/enrollment.repository'
import { courseRepository } from '../repositories/course.repository'
import { batchRepository } from '../repositories/batch.repository'
import { trainerRepository } from '../repositories/trainer.repository'
import { curriculumRepository } from '../repositories/curriculum.repository'
import { lessonResourceRepository } from '../repositories/lesson-resource.repository'
import { lessonProgressRepository } from '../repositories/lesson-progress.repository'
import { auditLogRepository } from '../repositories/audit-log.repository'
import type { EnrollmentDocument } from '../models/enrollment.model'
import type { BatchDocument } from '../models/batch.model'
import type { CourseDocument } from '../models/course.model'
import type { UpdateOwnProfileInput } from '../validators/student-portal.validator'
import type { IAddress, IEmergencyContact } from '../models/student.model'

/** Zod's `.optional()` sub-fields parse as `string | undefined`; the Mongoose schema stores `string | null`. Normalizes the boundary once here rather than at every call site. */
function normalizeAddress(address: NonNullable<UpdateOwnProfileInput['address']>): IAddress {
  return { ...address, line2: address.line2 ?? null }
}

function normalizeEmergencyContacts(
  contacts: NonNullable<UpdateOwnProfileInput['emergencyContacts']>,
): IEmergencyContact[] {
  return contacts.map((contact) => ({
    ...contact,
    alternatePhone: contact.alternatePhone ?? null,
    email: contact.email ?? null,
  }))
}

const DASHBOARD_COURSE_LIMIT = 6
const DASHBOARD_SCHEDULE_LIMIT = 5
const SCHEDULE_LIMIT = 20
const SCHEDULE_DAYS_AHEAD = 21
const RESOURCE_DELIVERY_EXPIRY_SECONDS = 300

interface EnrollmentContext {
  enrollments: EnrollmentDocument[]
  courseById: Map<string, CourseDocument>
  batchById: Map<string, BatchDocument>
}

/** One shared load for every list-shaped student view — a single enrollments query plus one batch `findByIds` and one course `findByIds`, never a query per row. */
async function loadEnrollmentContext(studentId: string): Promise<EnrollmentContext> {
  const enrollments = await enrollmentRepository.findAllByStudent(studentId)

  const courseIds = [...new Set(enrollments.map((enrollment) => enrollment.courseId.toString()))]
  const batchIds = [...new Set(enrollments.map((enrollment) => enrollment.batchId.toString()))]

  const [courses, batches] = await Promise.all([
    courseRepository.findByIds(courseIds),
    batchRepository.findByIds(batchIds),
  ])

  return {
    enrollments,
    courseById: new Map(courses.map((course) => [course._id.toString(), course])),
    batchById: new Map(batches.map((batch) => [batch._id.toString(), batch])),
  }
}

/**
 * A course's worth of work (2 queries) per distinct enrolled course, run in
 * parallel — bounded by a student's own enrollment count (naturally small,
 * never hundreds), so this stays a deliberate, documented parallel-fetch
 * rather than a true N+1 against a large row set.
 */
async function loadCourseProgressMap(
  studentId: string,
  courseIds: string[],
): Promise<Map<string, CourseProgressSummary>> {
  const entries = await Promise.all(
    courseIds.map(async (courseId): Promise<[string, CourseProgressSummary]> => [
      courseId,
      await computeCourseProgressForStudent(studentId, courseId),
    ]),
  )
  return new Map(entries)
}

function buildEnrollmentDtos(
  context: EnrollmentContext,
  progressByCourseId: Map<string, CourseProgressSummary>,
): StudentEnrollmentDto[] {
  const dtos: StudentEnrollmentDto[] = []
  for (const enrollment of context.enrollments) {
    const course = context.courseById.get(enrollment.courseId.toString())
    if (!course) continue // course was hard-removed or never resolved — skip rather than crash the list
    const batch = context.batchById.get(enrollment.batchId.toString()) ?? null
    dtos.push(
      toEnrollmentDto(
        enrollment,
        course,
        batch,
        computeEnrollmentAccessState(enrollment),
        hasLearningAccess(enrollment),
        progressByCourseId.get(course._id.toString()) ?? null,
      ),
    )
  }
  return dtos
}

/**
 * Precedence rule (Phase 12): a real `live_classes` session record always
 * wins over the derived weekly-timetable projection for the same batch +
 * calendar date — a student must never see one class listed twice. Every
 * real session in the window (SCHEDULED/LIVE/COMPLETED/CANCELLED — anything
 * this query can return) suppresses the derived occurrence for that date;
 * CANCELLED sessions suppress but are not re-added here (this lightweight
 * preview has no status field to show "cancelled" — the dedicated
 * `/student/live-classes` page is where that detail lives), so a cancelled
 * date simply drops out rather than falling back to a phantom derived slot
 * that will never happen.
 */
async function buildUpcomingSchedule(
  context: EnrollmentContext,
  limit: number,
): Promise<(ScheduleOccurrence & { batchName: string; courseTitle: string })[]> {
  const now = new Date()
  const windowEnd = new Date(now.getTime() + SCHEDULE_DAYS_AHEAD * 24 * 60 * 60 * 1000)

  const accessibleBatchIds = [
    ...new Set(
      context.enrollments
        .filter((enrollment) => hasLearningAccess(enrollment))
        .map((enrollment) => enrollment.batchId.toString()),
    ),
  ]
  const realSessions = await liveClassRepository.findUpcomingForBatches(
    accessibleBatchIds,
    now,
    windowEnd,
  )

  const suppressedSlots = new Set<string>()
  const results: (ScheduleOccurrence & { batchName: string; courseTitle: string })[] = []

  for (const session of realSessions) {
    const batch = context.batchById.get(session.batchId.toString())
    const course = context.courseById.get(session.courseId.toString())
    if (!batch || !course) continue

    suppressedSlots.add(
      `${session.batchId.toString()}|${dateKeyInTimezone(session.startDateTime, session.timezone)}`,
    )
    if (session.status === 'CANCELLED') continue

    results.push({
      date: dateKeyInTimezone(session.startDateTime, session.timezone),
      dayOfWeek: dayOfWeekInTimezone(session.startDateTime, session.timezone),
      startTime: utcToWallTime(session.startDateTime, session.timezone),
      endTime: utcToWallTime(session.endDateTime, session.timezone),
      sessionLabel: session.title,
      deliveryMode: session.deliveryMode,
      batchName: batch.name,
      courseTitle: course.title,
    })
  }

  for (const enrollment of context.enrollments) {
    if (!hasLearningAccess(enrollment)) continue
    const batch = context.batchById.get(enrollment.batchId.toString())
    const course = context.courseById.get(enrollment.courseId.toString())
    if (!batch || !course) continue

    const occurrences = generateUpcomingOccurrences({
      weeklySchedule: batch.weeklySchedule,
      calendarExceptions: batch.calendarExceptions,
      startDate: batch.startDate,
      endDate: batch.endDate,
      deliveryMode: batch.deliveryMode,
      timezone: batch.timezone,
      from: now,
      daysAhead: SCHEDULE_DAYS_AHEAD,
      maxOccurrences: limit,
    })

    for (const occurrence of occurrences) {
      if (suppressedSlots.has(`${batch._id.toString()}|${occurrence.date}`)) continue
      results.push({ ...occurrence, batchName: batch.name, courseTitle: course.title })
    }
  }

  return results
    .sort((a, b) =>
      a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date),
    )
    .slice(0, limit)
}

async function listEnrollmentsForUser(userId: string): Promise<StudentEnrollmentDto[]> {
  const student = await resolveStudentForUser(userId)
  const context = await loadEnrollmentContext(student._id.toString())
  const progressByCourseId = await loadCourseProgressMap(student._id.toString(), [
    ...context.courseById.keys(),
  ])
  return buildEnrollmentDtos(context, progressByCourseId)
}

export const studentPortalService = {
  async getDashboard(userId: string): Promise<StudentDashboardDto> {
    const student = await resolveStudentForUser(userId)
    const context = await loadEnrollmentContext(student._id.toString())
    const progressByCourseId = await loadCourseProgressMap(student._id.toString(), [
      ...context.courseById.keys(),
    ])
    const enrollmentDtos = buildEnrollmentDtos(context, progressByCourseId)

    const continueLearning =
      enrollmentDtos.find((dto) => dto.hasAccess && dto.status === 'ACTIVE') ??
      enrollmentDtos.find((dto) => dto.hasAccess) ??
      null

    return {
      continueLearning,
      courses: enrollmentDtos.slice(0, DASHBOARD_COURSE_LIMIT),
      upcomingSchedule: await buildUpcomingSchedule(context, DASHBOARD_SCHEDULE_LIMIT),
    }
  },

  listEnrollments(userId: string): Promise<StudentEnrollmentDto[]> {
    return listEnrollmentsForUser(userId)
  },

  /** "My Courses" is the same underlying relationship as "my enrollments" in this data model — one course per enrollment row — so this deliberately reuses the same loader rather than a parallel query. */
  listCourses(userId: string): Promise<StudentEnrollmentDto[]> {
    return listEnrollmentsForUser(userId)
  },

  async getEnrollment(userId: string, enrollmentId: string): Promise<StudentEnrollmentDto> {
    const student = await resolveStudentForUser(userId)
    const enrollment = await enrollmentRepository.findById(enrollmentId)
    // Not found AND "belongs to someone else" both resolve to 404 — never disclose that another student's enrollment id exists.
    if (enrollment?.studentId.toString() !== student._id.toString()) {
      throw ApiError.notFound('Enrollment not found')
    }

    const [course, batch] = await Promise.all([
      courseRepository.findById(enrollment.courseId.toString()),
      batchRepository.findById(enrollment.batchId.toString()),
    ])
    if (!course) throw ApiError.notFound('Enrollment not found')

    const courseProgress = await computeCourseProgressForStudent(
      student._id.toString(),
      course._id.toString(),
    )

    return toEnrollmentDto(
      enrollment,
      course,
      batch,
      computeEnrollmentAccessState(enrollment),
      hasLearningAccess(enrollment),
      courseProgress,
    )
  },

  async getCourseOverview(userId: string, courseId: string): Promise<StudentCourseDetailDto> {
    const student = await resolveStudentForUser(userId)
    const enrollment = await enrollmentRepository.findLatestByStudentAndCourse(
      student._id.toString(),
      courseId,
    )
    // Never enrolled in this course at all — 404, not 403, to avoid confirming the course id exists to an uninvolved student.
    if (!enrollment) throw ApiError.notFound('Course not found')

    const course = await courseRepository.findById(courseId)
    if (!course) throw ApiError.notFound('Course not found')

    const [batch, accessState, hasAccess] = await Promise.all([
      batchRepository.findById(enrollment.batchId.toString()),
      Promise.resolve(computeEnrollmentAccessState(enrollment)),
      Promise.resolve(hasLearningAccess(enrollment)),
    ])

    const trainer = batch?.primaryTrainerId
      ? await trainerRepository.findById(batch.primaryTrainerId.toString())
      : null

    // Curriculum is only ever populated for an enrollment that currently grants access — a suspended/ended relationship still renders the course header (so the UI can show *why* access is paused) but never the lesson tree.
    let modules: StudentCourseDetailDto['modules'] = []
    const courseProgress = await computeCourseProgressForStudent(student._id.toString(), courseId)
    if (hasAccess) {
      const [allModules, allLessons, progressRows] = await Promise.all([
        curriculumRepository.findModulesByCourse(courseId),
        curriculumRepository.findLessonsByCourse(courseId),
        lessonProgressRepository.findAllByStudentAndCourse(student._id.toString(), courseId),
      ])
      const publishedModules = allModules.filter(
        (courseModule) => courseModule.status === 'PUBLISHED',
      )
      const progressStatusById = new Map(
        progressRows.map((row) => [row.lessonId.toString(), row.status]),
      )
      const completedLessonIds = new Set(
        progressRows
          .filter((row) => row.status === 'COMPLETED')
          .map((row) => row.lessonId.toString()),
      )

      const publishedLessonsByModule = new Map<string, ReturnType<typeof toLessonDto>[]>()
      for (const lesson of allLessons) {
        if (lesson.status !== 'PUBLISHED') continue
        const key = lesson.courseModuleId.toString()
        const existing = publishedLessonsByModule.get(key) ?? []
        const unlocked = isLessonUnlocked(
          lesson.prerequisiteLessonIds.map((id) => id.toString()),
          completedLessonIds,
        )
        existing.push(
          toLessonDto(
            lesson,
            progressStatusById.get(lesson._id.toString()) ?? 'NOT_STARTED',
            !unlocked,
            unlocked ? null : 'Complete the required lesson first.',
          ),
        )
        publishedLessonsByModule.set(key, existing)
      }
      modules = publishedModules
        .map((courseModule) =>
          toModuleDto(
            courseModule,
            publishedLessonsByModule.get(courseModule._id.toString()) ?? [],
          ),
        )
        .sort((a, b) => a.order - b.order)
    }

    return {
      id: course._id.toString(),
      courseCode: course.courseCode,
      title: course.title,
      shortDescription: course.shortDescription,
      description: course.description,
      level: course.level,
      language: course.language,
      deliveryMode: course.deliveryMode,
      certificateEnabled: course.certificateEnabled,
      thumbnailUrl: course.thumbnailUrl,
      accessState,
      hasAccess,
      enrollmentStatus: enrollment.status,
      batch: batch ? toBatchSummaryDto(batch) : null,
      trainer: trainer ? toTrainerSummaryDto(trainer) : null,
      modules,
      courseProgress,
    }
  },

  async listSchedule(userId: string): Promise<StudentDashboardDto['upcomingSchedule']> {
    const student = await resolveStudentForUser(userId)
    const context = await loadEnrollmentContext(student._id.toString())
    return buildUpcomingSchedule(context, SCHEDULE_LIMIT)
  },

  async listResources(userId: string): Promise<StudentResourceDto[]> {
    const student = await resolveStudentForUser(userId)
    const context = await loadEnrollmentContext(student._id.toString())

    const accessibleCourseIds = [
      ...new Set(
        context.enrollments
          .filter((enrollment) => hasLearningAccess(enrollment))
          .map((enrollment) => enrollment.courseId.toString()),
      ),
    ]

    const results: StudentResourceDto[] = []
    for (const courseId of accessibleCourseIds) {
      const course = context.courseById.get(courseId)
      if (!course) continue

      const [lessons, resources] = await Promise.all([
        curriculumRepository.findLessonsByCourse(courseId),
        lessonResourceRepository.findActiveByCourse(courseId),
      ])
      const publishedLessonById = new Map(
        lessons
          .filter((lesson) => lesson.status === 'PUBLISHED')
          .map((lesson) => [lesson._id.toString(), lesson]),
      )

      for (const resource of resources) {
        const lesson = publishedLessonById.get(resource.lessonId.toString())
        if (!lesson) continue // resource belongs to a draft/archived lesson — never surfaced to a student
        results.push(toResourceDto(resource, lesson, course))
      }
    }

    return results
  },

  async getResourceDeliveryUrl(
    userId: string,
    resourceId: string,
  ): Promise<{ url: string; expiresInSeconds: number }> {
    const resource = await lessonResourceRepository.findByIdAcrossLessons(resourceId)
    if (!resource) throw ApiError.notFound('Resource not found')

    await enrollmentAccessService.assertStudentCourseAccess({
      userId,
      courseId: resource.courseId.toString(),
    })

    const lesson = await curriculumRepository.findLessonById(
      resource.courseId.toString(),
      resource.lessonId.toString(),
    )
    if (lesson?.status !== 'PUBLISHED') throw ApiError.notFound('Resource not found')

    const url = generateSignedDeliveryUrl(resource.publicId, {
      resourceType: 'raw',
      format: resource.format,
      expirySeconds: RESOURCE_DELIVERY_EXPIRY_SECONDS,
    })
    return { url, expiresInSeconds: RESOURCE_DELIVERY_EXPIRY_SECONDS }
  },

  async getProfile(userId: string): Promise<StudentProfileDto> {
    const student = await resolveStudentForUser(userId)
    const user = await userRepository.findById(userId)
    if (!user) throw ApiError.notFound('Account not found')
    return toProfileDto(student, user.email)
  },

  async updateProfile(
    userId: string,
    input: UpdateOwnProfileInput,
    context: RequestContext,
  ): Promise<StudentProfileDto> {
    const student = await resolveStudentForUser(userId)
    const user = await userRepository.findById(userId)
    if (!user) throw ApiError.notFound('Account not found')

    const merged = {
      phone: input.phone ?? student.phone,
      alternatePhone: input.alternatePhone ?? student.alternatePhone,
      address: input.address ? normalizeAddress(input.address) : student.address,
      emergencyContacts: input.emergencyContacts
        ? normalizeEmergencyContacts(input.emergencyContacts)
        : student.emergencyContacts,
    }

    const { percentage, status } = calculateProfileCompletion({
      firstName: student.firstName,
      lastName: student.lastName,
      dateOfBirth: student.dateOfBirth,
      gender: student.gender,
      phone: merged.phone,
      address: merged.address,
      emergencyContacts: merged.emergencyContacts,
      educationRecords: student.educationRecords,
      profilePhotoUrl: student.profilePhotoUrl,
    })

    const updated = await studentRepository.updateById(student._id.toString(), {
      ...merged,
      profileCompletionPercentage: percentage,
      profileCompletionStatus: status,
    })
    if (!updated) throw ApiError.notFound('Account not found')

    await auditLogRepository.record({
      actorId: userId,
      actorRole: 'STUDENT',
      action: 'student.profile.self_update',
      entityType: 'student',
      entityId: student._id.toString(),
      metadata: { fields: Object.keys(input) },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return toProfileDto(updated, user.email)
  },
}
