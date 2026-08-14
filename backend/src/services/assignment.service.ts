import { Types } from 'mongoose'

import { ApiError } from '../utils/api-error'
import { canTransitionAssignment, isAssignmentEditable } from '../utils/assignment-lifecycle.util'
import { generateAssignmentCode } from './assignment-id.service'
import {
  ALLOWED_RESOURCE_FORMATS,
  deleteAsset,
  generateSignedUploadParams,
  verifyUploadedAsset,
  type SignedUploadParams,
} from './cloudinary-upload.service'
import { generateSignedDeliveryUrl } from './media-delivery.service'
import { resolveMimeType } from '../utils/lesson-resource-format.util'
import { toAdminAssignmentDto, type AdminAssignmentDto } from './assignment-dto'
import {
  assignmentRepository,
  type ListAssignmentsFilter,
} from '../repositories/assignment.repository'
import { assignmentSubmissionRepository } from '../repositories/assignment-submission.repository'
import { courseRepository } from '../repositories/course.repository'
import { batchRepository } from '../repositories/batch.repository'
import { auditLogRepository } from '../repositories/audit-log.repository'
import type { AssignmentDocument, AssignmentStatus } from '../models/assignment.model'
import type { CourseDocument } from '../models/course.model'
import type { BatchDocument } from '../models/batch.model'
import type { AuthenticatedUser } from '../types/auth'
import type { RequestContext } from './user-management.service'
import type {
  CancelAssignmentInput,
  ConfirmAttachmentInput,
  CreateAssignmentInput,
  ListAssignmentsQuery,
  UpdateAssignmentInput,
} from '../validators/assignment.validator'

const AUDIT_ENTITY_TYPE = 'assignment'
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024

function attachmentFolder(assignmentId: string): string {
  return `daisy-minds/assignments/${assignmentId}/attachments`
}

async function recordAudit(
  assignmentId: string,
  action: string,
  actor: AuthenticatedUser,
  context: RequestContext,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await auditLogRepository.record({
    actorId: actor.id,
    actorRole: actor.role,
    action,
    entityType: AUDIT_ENTITY_TYPE,
    entityId: assignmentId,
    metadata,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  })
}

async function requireCourse(courseId: string): Promise<CourseDocument> {
  const course = await courseRepository.findById(courseId)
  if (!course) throw ApiError.notFound('Course not found')
  return course
}

/** Every target batch must exist and belong to the same course — never a batch from another course (task's own explicit rule). */
async function requireTargetBatches(
  courseId: string,
  batchIds: string[],
): Promise<BatchDocument[]> {
  if (batchIds.length === 0) throw ApiError.badRequest('At least one target batch is required')
  const batches = await batchRepository.findByIds(batchIds)
  if (batches.length !== batchIds.length)
    throw ApiError.badRequest('One or more target batches do not exist')
  const mismatched = batches.filter((batch) => batch.courseId.toString() !== courseId)
  if (mismatched.length > 0) {
    throw ApiError.badRequest("Every target batch must belong to the assignment's own course")
  }
  return batches
}

async function buildDtos(assignments: AssignmentDocument[]): Promise<AdminAssignmentDto[]> {
  const courseIds = [...new Set(assignments.map((assignment) => assignment.courseId.toString()))]
  const batchIds = [
    ...new Set(assignments.flatMap((assignment) => assignment.batchIds.map((id) => id.toString()))),
  ]
  const assignmentIds = assignments.map((assignment) => assignment._id.toString())

  const [courses, batches, countsMap] = await Promise.all([
    courseRepository.findByIds(courseIds),
    batchRepository.findByIds(batchIds),
    assignmentSubmissionRepository.countsByAssignmentIds(assignmentIds),
  ])

  const courseById = new Map(courses.map((course) => [course._id.toString(), course]))
  const batchById = new Map(batches.map((batch) => [batch._id.toString(), batch]))

  const dtos: AdminAssignmentDto[] = []
  for (const assignment of assignments) {
    const course = courseById.get(assignment.courseId.toString())
    if (!course) continue
    dtos.push(
      toAdminAssignmentDto(assignment, course, batchById, countsMap.get(assignment._id.toString())),
    )
  }
  return dtos
}

function toFilter(query: ListAssignmentsQuery): ListAssignmentsFilter {
  return {
    courseId: query.courseId,
    batchId: query.batchId,
    status: query.status,
    search: query.search,
  }
}

/**
 * Verifies every field a `PUBLISHED` assignment must have before it can
 * ever become visible to a student — structured blockers, never a bare
 * `400`, mirroring `batch-readiness.service.ts`'s own shape. Called only
 * from `publishAssignment`; there is no separate `GET .../readiness`
 * endpoint since, unlike a batch (which an admin iterates on over days),
 * an assignment's publish button is the only place this matters.
 */
function assertReadyToPublish(assignment: AssignmentDocument): void {
  const blockers: { field: string; message: string }[] = []

  if (assignment.title.trim().length === 0)
    blockers.push({ field: 'title', message: 'Title is required' })
  if (assignment.instructions.trim().length === 0) {
    blockers.push({ field: 'instructions', message: 'Instructions are required' })
  }
  if (assignment.batchIds.length === 0) {
    blockers.push({ field: 'batchIds', message: 'At least one target batch is required' })
  }
  if (assignment.maxMarks <= 0)
    blockers.push({ field: 'maxMarks', message: 'Max marks must be greater than 0' })
  if (assignment.passingMarks !== null && assignment.passingMarks > assignment.maxMarks) {
    blockers.push({ field: 'passingMarks', message: 'Passing marks cannot exceed max marks' })
  }
  if (Number.isNaN(assignment.dueDateTime.getTime())) {
    blockers.push({ field: 'dueDateTime', message: 'A valid due date is required' })
  }
  if (
    assignment.allowLateSubmission &&
    assignment.lateUntil &&
    assignment.lateUntil < assignment.dueDateTime
  ) {
    blockers.push({ field: 'lateUntil', message: 'Late-until must be after the due date' })
  }
  if (
    (assignment.submissionType === 'FILE' || assignment.submissionType === 'MIXED') &&
    assignment.allowedFileTypes.length === 0
  ) {
    blockers.push({
      field: 'allowedFileTypes',
      message: 'At least one allowed file type is required',
    })
  }

  if (blockers.length > 0) {
    throw ApiError.unprocessable(
      'This assignment is not ready to publish',
      blockers.map((blocker) => ({ field: blocker.field, message: blocker.message })),
    )
  }
}

export const assignmentService = {
  async listAssignments(query: ListAssignmentsQuery): Promise<{
    data: AdminAssignmentDto[]
    meta: { page: number; limit: number; total: number; totalPages: number }
  }> {
    const { rows, total } = await assignmentRepository.list(toFilter(query), {
      page: query.page,
      limit: query.limit,
      sortField: query.sort.field,
      sortDirection: query.sort.direction,
    })
    const data = await buildDtos(rows)
    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    }
  },

  async getAssignment(id: string): Promise<AdminAssignmentDto> {
    const assignment = await assignmentRepository.findById(id)
    if (!assignment) throw ApiError.notFound('Assignment not found')
    const [dto] = await buildDtos([assignment])
    if (!dto) throw ApiError.notFound('Assignment not found')
    return dto
  },

  async createAssignment(
    input: CreateAssignmentInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminAssignmentDto> {
    await requireCourse(input.courseId)
    await requireTargetBatches(input.courseId, input.batchIds)

    if (
      (input.submissionType === 'FILE' || input.submissionType === 'MIXED') &&
      input.allowedFileTypes.length === 0
    ) {
      throw ApiError.badRequest(
        'At least one allowed file type is required for a file submission type',
      )
    }

    const assignmentCode = await generateAssignmentCode()
    const assignment = await assignmentRepository.create({
      assignmentCode,
      courseId: new Types.ObjectId(input.courseId),
      batchIds: input.batchIds.map((id) => new Types.ObjectId(id)),
      title: input.title,
      shortDescription: input.shortDescription ?? null,
      instructions: input.instructions,
      submissionType: input.submissionType,
      allowedFileTypes: input.allowedFileTypes,
      maxFiles: input.maxFiles,
      maxFileSizeBytes: input.maxFileSizeBytes,
      maxMarks: input.maxMarks,
      passingMarks: input.passingMarks ?? null,
      dueDateTime: input.dueDateTime,
      timezone: input.timezone,
      allowLateSubmission: input.allowLateSubmission,
      lateUntil: input.lateUntil ?? null,
      allowResubmission: input.allowResubmission,
      maxAttempts: input.maxAttempts ?? null,
      status: 'DRAFT',
      createdBy: new Types.ObjectId(actor.id),
    })

    await recordAudit(assignment._id.toString(), 'assignment.created', actor, context, {
      assignmentCode,
    })

    const [dto] = await buildDtos([assignment])
    if (!dto) throw ApiError.notFound('Assignment not found')
    return dto
  },

  async updateAssignment(
    id: string,
    input: UpdateAssignmentInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminAssignmentDto> {
    const assignment = await assignmentRepository.findById(id)
    if (!assignment) throw ApiError.notFound('Assignment not found')
    if (!isAssignmentEditable(assignment.status)) {
      throw ApiError.conflict('Only a DRAFT assignment can be edited')
    }

    if (input.batchIds) {
      await requireTargetBatches(assignment.courseId.toString(), input.batchIds)
    }

    const update: Record<string, unknown> = { updatedBy: actor.id }
    if (input.title !== undefined) update.title = input.title
    if (input.shortDescription !== undefined) update.shortDescription = input.shortDescription
    if (input.instructions !== undefined) update.instructions = input.instructions
    if (input.batchIds !== undefined)
      update.batchIds = input.batchIds.map((bid) => new Types.ObjectId(bid))
    if (input.submissionType !== undefined) update.submissionType = input.submissionType
    if (input.allowedFileTypes !== undefined) update.allowedFileTypes = input.allowedFileTypes
    if (input.maxFiles !== undefined) update.maxFiles = input.maxFiles
    if (input.maxFileSizeBytes !== undefined) update.maxFileSizeBytes = input.maxFileSizeBytes
    if (input.maxMarks !== undefined) update.maxMarks = input.maxMarks
    if (input.passingMarks !== undefined) update.passingMarks = input.passingMarks
    if (input.dueDateTime !== undefined) update.dueDateTime = input.dueDateTime
    if (input.timezone !== undefined) update.timezone = input.timezone
    if (input.allowLateSubmission !== undefined)
      update.allowLateSubmission = input.allowLateSubmission
    if (input.lateUntil !== undefined) update.lateUntil = input.lateUntil
    if (input.allowResubmission !== undefined) update.allowResubmission = input.allowResubmission
    if (input.maxAttempts !== undefined) update.maxAttempts = input.maxAttempts

    const updated = await assignmentRepository.updateById(id, update)
    if (!updated) throw ApiError.notFound('Assignment not found')

    await recordAudit(id, 'assignment.updated', actor, context, { fields: Object.keys(update) })

    const [dto] = await buildDtos([updated])
    if (!dto) throw ApiError.notFound('Assignment not found')
    return dto
  },

  async transition(
    id: string,
    to: AssignmentStatus,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminAssignmentDto> {
    const assignment = await assignmentRepository.findById(id)
    if (!assignment) throw ApiError.notFound('Assignment not found')
    if (!canTransitionAssignment(assignment.status, to)) {
      throw ApiError.conflict(`Cannot move an assignment from ${assignment.status} to ${to}`)
    }
    if (to === 'PUBLISHED') assertReadyToPublish(assignment)

    const update: Record<string, unknown> = { status: to, updatedBy: actor.id }
    const now = new Date()
    if (to === 'PUBLISHED') update.publishedAt = now
    if (to === 'CLOSED') update.closedAt = now

    const updated = await assignmentRepository.updateById(id, update)
    if (!updated) throw ApiError.notFound('Assignment not found')

    const actionByStatus: Partial<Record<AssignmentStatus, string>> = {
      PUBLISHED: 'assignment.published',
      CLOSED: 'assignment.closed',
      ARCHIVED: 'assignment.archived',
    }
    await recordAudit(id, actionByStatus[to] ?? 'assignment.updated', actor, context, {
      from: assignment.status,
      to,
    })

    const [dto] = await buildDtos([updated])
    if (!dto) throw ApiError.notFound('Assignment not found')
    return dto
  },

  async cancelAssignment(
    id: string,
    input: CancelAssignmentInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminAssignmentDto> {
    const assignment = await assignmentRepository.findById(id)
    if (!assignment) throw ApiError.notFound('Assignment not found')
    if (!canTransitionAssignment(assignment.status, 'CANCELLED')) {
      throw ApiError.conflict(`Cannot cancel an assignment in ${assignment.status} status`)
    }

    const updated = await assignmentRepository.updateById(id, {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancellationReason: input.reason,
      updatedBy: actor.id,
    })
    if (!updated) throw ApiError.notFound('Assignment not found')

    await recordAudit(id, 'assignment.cancelled', actor, context, { reason: input.reason })

    const [dto] = await buildDtos([updated])
    if (!dto) throw ApiError.notFound('Assignment not found')
    return dto
  },

  async getAttachmentUploadSignature(id: string): Promise<SignedUploadParams> {
    const assignment = await assignmentRepository.findById(id)
    if (!assignment) throw ApiError.notFound('Assignment not found')
    if (!isAssignmentEditable(assignment.status)) {
      throw ApiError.conflict('Attachments can only be added to a DRAFT assignment')
    }

    const folder = attachmentFolder(id)
    const publicId = `${folder}/resource-${String(Date.now())}`
    return generateSignedUploadParams(folder, publicId, {
      resourceType: 'raw',
      type: 'authenticated',
      allowedFormats: ALLOWED_RESOURCE_FORMATS,
      maxFileSize: MAX_ATTACHMENT_BYTES,
    })
  },

  async confirmAttachment(
    id: string,
    input: ConfirmAttachmentInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminAssignmentDto> {
    const assignment = await assignmentRepository.findById(id)
    if (!assignment) throw ApiError.notFound('Assignment not found')
    if (!isAssignmentEditable(assignment.status)) {
      throw ApiError.conflict('Attachments can only be added to a DRAFT assignment')
    }

    const folder = attachmentFolder(id)
    const asset = await verifyUploadedAsset(input.publicId, folder, {
      resourceType: 'raw',
      type: 'authenticated',
      maxFileSize: MAX_ATTACHMENT_BYTES,
    })

    const updated = await assignmentRepository.updateById(id, {
      $push: {
        attachments: {
          publicId: input.publicId,
          assetId: asset.assetId,
          filename: input.filename,
          format: asset.format,
          mimeType: resolveMimeType(asset.format),
          bytes: asset.bytes,
        },
      },
      updatedBy: actor.id,
    })
    if (!updated) throw ApiError.notFound('Assignment not found')

    await recordAudit(id, 'assignment.attachment_added', actor, context, {
      publicId: input.publicId,
      bytes: asset.bytes,
    })

    const [dto] = await buildDtos([updated])
    if (!dto) throw ApiError.notFound('Assignment not found')
    return dto
  },

  async removeAttachment(
    id: string,
    attachmentId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminAssignmentDto> {
    const assignment = await assignmentRepository.findById(id)
    if (!assignment) throw ApiError.notFound('Assignment not found')
    if (!isAssignmentEditable(assignment.status)) {
      throw ApiError.conflict('Attachments can only be removed from a DRAFT assignment')
    }
    const attachment = assignment.attachments.find((item) => item._id.toString() === attachmentId)
    if (!attachment) throw ApiError.notFound('Attachment not found')

    const updated = await assignmentRepository.updateById(id, {
      $pull: { attachments: { _id: attachment._id } },
      updatedBy: actor.id,
    })
    if (!updated) throw ApiError.notFound('Assignment not found')

    await deleteAsset(attachment.publicId, 'raw', 'authenticated')
    await recordAudit(id, 'assignment.attachment_removed', actor, context, { attachmentId })

    const [dto] = await buildDtos([updated])
    if (!dto) throw ApiError.notFound('Assignment not found')
    return dto
  },

  /** Shared by every namespace's own delivery-url endpoint — the caller (admin/trainer/student controller) is responsible for its own visibility check before calling this. Addresses the attachment by its Mongo `_id`, never the raw Cloudinary `publicId` (never exposed to any client). */
  async getAttachmentDeliveryUrl(
    id: string,
    attachmentId: string,
  ): Promise<{ url: string; expiresInSeconds: number }> {
    const assignment = await assignmentRepository.findById(id)
    if (!assignment) throw ApiError.notFound('Assignment not found')
    const attachment = assignment.attachments.find((item) => item._id.toString() === attachmentId)
    if (!attachment) throw ApiError.notFound('Attachment not found')

    const expiresInSeconds = 300
    const url = generateSignedDeliveryUrl(attachment.publicId, {
      resourceType: 'raw',
      format: attachment.format,
      expirySeconds: expiresInSeconds,
    })
    return { url, expiresInSeconds }
  },
}
