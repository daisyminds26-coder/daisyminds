import { resolveStudentForUser } from './student-identity.util'
import { attendanceService } from './attendance.service'
import { courseRepository } from '../repositories/course.repository'
import { enrollmentRepository } from '../repositories/enrollment.repository'
import type { StudentAttendanceRecordDto, StudentAttendanceSummaryDto } from './attendance-dto'

export interface StudentCourseAttendanceDto {
  courseId: string
  courseTitle: string
  summary: StudentAttendanceSummaryDto
}

export interface StudentAttendanceOverviewDto {
  courses: StudentCourseAttendanceDto[]
  recentRecords: StudentAttendanceRecordDto[]
}

/**
 * Composes the same shared `attendanceService` functions the admin report
 * uses (`getStudentAttendanceSummary`/`listStudentAttendanceRecords`) —
 * never a parallel calculation. Self-scoped: identity always comes from
 * `req.user.id`, never a client-supplied `studentId`.
 */
export async function getStudentAttendanceOverview(
  userId: string,
): Promise<StudentAttendanceOverviewDto> {
  const student = await resolveStudentForUser(userId)
  const studentId = student._id.toString()

  const enrollments = await enrollmentRepository.findAllByStudent(studentId)
  const courseIds = [...new Set(enrollments.map((enrollment) => enrollment.courseId.toString()))]
  const courses = await courseRepository.findByIds(courseIds)
  const courseById = new Map(courses.map((course) => [course._id.toString(), course]))

  const courseSummaries: StudentCourseAttendanceDto[] = []
  for (const courseId of courseIds) {
    const course = courseById.get(courseId)
    if (!course) continue
    const summary = await attendanceService.getStudentAttendanceSummary(studentId, courseId)
    if (summary.totalFinalizedSessions === 0) continue
    courseSummaries.push({ courseId, courseTitle: course.title, summary })
  }

  const recentRecords = await attendanceService.listStudentAttendanceRecords(studentId)

  return { courses: courseSummaries, recentRecords }
}
