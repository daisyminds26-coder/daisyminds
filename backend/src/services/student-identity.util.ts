import { ApiError } from '../utils/api-error'
import { studentRepository } from '../repositories/student.repository'
import type { StudentDocument } from '../models/student.model'

/**
 * Every self-scoped student route (Phase 11A's `student-portal.service.ts`,
 * Phase 11B's `student-lesson-access.service.ts`) resolves identity through
 * here — never from a client-supplied `studentId`. Extracted once both
 * services needed the identical three lines, per "never duplicate business
 * logic."
 */
export async function resolveStudentForUser(userId: string): Promise<StudentDocument> {
  const student = await studentRepository.findByUserId(userId)
  if (!student) throw ApiError.forbidden('No student profile linked to this account')
  return student
}
