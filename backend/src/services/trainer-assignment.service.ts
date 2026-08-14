import { ApiError } from '../utils/api-error'
import { resolveTrainerForUser } from './trainer-identity.util'
import {
  assignmentSubmissionService,
  type SubmissionListFilter,
} from './assignment-submission.service'
import { toAdminAssignmentDto, type AdminAssignmentDto } from './assignment-dto'
import { assignmentRepository } from '../repositories/assignment.repository'
import { assignmentSubmissionRepository } from '../repositories/assignment-submission.repository'
import { courseRepository } from '../repositories/course.repository'
import { batchRepository } from '../repositories/batch.repository'
import type { AssignmentDocument } from '../models/assignment.model'
import type { AuthenticatedUser } from '../types/auth'
import type { RequestContext } from './user-management.service'
import type { AssignmentSubmissionDto } from './assignment-submission-dto'
import type {
  GradeSubmissionInput,
  ReturnSubmissionInput,
} from '../validators/assignment-submission.validator'

/** A trainer may only ever act on an assignment that targets at least one batch they teach (`primaryTrainerId`/`assistantTrainerIds`) — never arbitrary assignment access. Not found, not forbidden, for anything else: no existence disclosure. */
async function requireOwnedAssignment(
  trainerId: string,
  assignmentId: string,
): Promise<AssignmentDocument> {
  const assignment = await assignmentRepository.findById(assignmentId)
  if (!assignment) throw ApiError.notFound('Assignment not found')

  const myBatches = await batchRepository.findIdsForTrainer(trainerId)
  const myBatchIds = new Set(myBatches.map((batch) => batch._id.toString()))
  const owned = assignment.batchIds.some((batchId) => myBatchIds.has(batchId.toString()))
  if (!owned) throw ApiError.notFound('Assignment not found')

  return assignment
}

async function buildDto(assignment: AssignmentDocument): Promise<AdminAssignmentDto> {
  const [course, batches, countsMap] = await Promise.all([
    courseRepository.findById(assignment.courseId.toString()),
    batchRepository.findByIds(assignment.batchIds.map((id) => id.toString())),
    assignmentSubmissionRepository.countsByAssignmentIds([assignment._id.toString()]),
  ])
  if (!course) throw ApiError.notFound('Assignment not found')
  const batchById = new Map(batches.map((batch) => [batch._id.toString(), batch]))
  return toAdminAssignmentDto(
    assignment,
    course,
    batchById,
    countsMap.get(assignment._id.toString()),
  )
}

export const trainerAssignmentService = {
  async listMyAssignments(userId: string): Promise<AdminAssignmentDto[]> {
    const trainer = await resolveTrainerForUser(userId)
    const myBatches = await batchRepository.findIdsForTrainer(trainer._id.toString())
    const myBatchIds = myBatches.map((batch) => batch._id.toString())

    const assignments = await assignmentRepository.findForBatchesAnyStatus(myBatchIds, {})
    return Promise.all(assignments.map((assignment) => buildDto(assignment)))
  },

  async getMyAssignment(userId: string, assignmentId: string): Promise<AdminAssignmentDto> {
    const trainer = await resolveTrainerForUser(userId)
    const assignment = await requireOwnedAssignment(trainer._id.toString(), assignmentId)
    return buildDto(assignment)
  },

  async listMySubmissions(
    userId: string,
    assignmentId: string,
    filter: SubmissionListFilter,
  ): Promise<AssignmentSubmissionDto[]> {
    const trainer = await resolveTrainerForUser(userId)
    await requireOwnedAssignment(trainer._id.toString(), assignmentId)
    return assignmentSubmissionService.listSubmissions(assignmentId, filter)
  },

  async getMySubmission(
    userId: string,
    assignmentId: string,
    submissionId: string,
  ): Promise<AssignmentSubmissionDto> {
    const trainer = await resolveTrainerForUser(userId)
    await requireOwnedAssignment(trainer._id.toString(), assignmentId)
    return assignmentSubmissionService.getSubmission(assignmentId, submissionId)
  },

  async getMyAttemptHistory(
    userId: string,
    assignmentId: string,
    studentId: string,
  ): Promise<AssignmentSubmissionDto[]> {
    const trainer = await resolveTrainerForUser(userId)
    await requireOwnedAssignment(trainer._id.toString(), assignmentId)
    return assignmentSubmissionService.getAttemptHistory(assignmentId, studentId)
  },

  async gradeMySubmission(
    userId: string,
    assignmentId: string,
    submissionId: string,
    input: GradeSubmissionInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AssignmentSubmissionDto> {
    const trainer = await resolveTrainerForUser(userId)
    await requireOwnedAssignment(trainer._id.toString(), assignmentId)
    return assignmentSubmissionService.gradeSubmission(
      assignmentId,
      submissionId,
      input,
      actor,
      context,
    )
  },

  /** A trainer can never override an assignment's own `allowResubmission` setting (only `ADMIN`/`SUPER_ADMIN` can — task's own explicit rule) — `canOverride` is always `false` here. */
  async returnMySubmission(
    userId: string,
    assignmentId: string,
    submissionId: string,
    input: ReturnSubmissionInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AssignmentSubmissionDto> {
    const trainer = await resolveTrainerForUser(userId)
    await requireOwnedAssignment(trainer._id.toString(), assignmentId)
    return assignmentSubmissionService.returnSubmission(
      assignmentId,
      submissionId,
      input,
      actor,
      context,
      false,
    )
  },
}
