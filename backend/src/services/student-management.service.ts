import { Types } from 'mongoose'

import { ApiError } from '../utils/api-error'
import { minutesFromNow } from '../utils/duration'
import { toCsv } from '../utils/csv'
import { env } from '../config/env'
import { enqueueAuthEmail } from '../queues/auth-email.queue'
import { auditLogRepository } from '../repositories/audit-log.repository'
import { roleRepository } from '../repositories/role.repository'
import {
  studentRepository,
  type ListStudentsFilter,
  type ListStudentsOptions,
  type StudentListRow,
} from '../repositories/student.repository'
import { userRepository } from '../repositories/user.repository'
import { userSessionRepository } from '../repositories/user-session.repository'
import { enrollmentRepository } from '../repositories/enrollment.repository'
import { hashPassword } from './password.service'
import { generateOpaqueTokenPair } from './token.service'
import { generateStudentId } from './student-id.service'
import {
  deleteAsset,
  generateSignedUploadParams,
  verifyUploadedAsset,
  type SignedUploadParams,
} from './cloudinary-upload.service'
import { UserModel, type UserDocument, type UserStatus } from '../models/user.model'
import type {
  Gender,
  IAddress,
  IEducationRecord,
  IEmergencyContact,
  ProfileCompletionStatus,
  StudentDocument,
  StudentSource,
} from '../models/student.model'
import type {
  CreateStudentInput,
  StudentBulkAction,
  UpdateStudentInput,
} from '../validators/student.validator'
import type { AuthenticatedUser } from '../types/auth'
/** Reused as-is — a request's IP/user-agent context has nothing student-specific about it. */
import type { RequestContext } from './user-management.service'

const STUDENT_ROLE = 'STUDENT'
/** Hard cap on an unpaginated export — never stream/load an unbounded result set (Performance section). */
const MAX_EXPORT_ROWS = 5000

export interface StudentAddressDto {
  line1: string
  line2: string | null
  city: string
  state: string
  postalCode: string
  country: string
}

export interface EmergencyContactDto {
  name: string
  phone: string
  relationship: string
  alternatePhone: string | null
  email: string | null
}

export interface EducationRecordDto {
  degree: string
  institution: string
  yearOfCompletion: number
  boardOrUniversity: string | null
  fieldOfStudy: string | null
  gradeValue: string | null
  gradeType: string | null
  documentUrl: string | null
  documentPublicId: string | null
}

export interface AdminStudentDto {
  id: string
  userId: string
  studentId: string
  email: string
  status: UserStatus
  isDeleted: boolean
  emailVerifiedAt: Date | null
  lastLoginAt: Date | null
  firstName: string
  middleName: string | null
  lastName: string
  displayName: string | null
  dateOfBirth: Date | null
  gender: Gender | null
  preferredLanguage: string | null
  phone: string | null
  alternatePhone: string | null
  address: StudentAddressDto | null
  emergencyContacts: EmergencyContactDto[]
  guardianName: string | null
  guardianPhone: string | null
  guardianEmail: string | null
  guardianRelationship: string | null
  guardianOccupation: string | null
  guardianAddressSameAsStudent: boolean
  guardianAddress: StudentAddressDto | null
  educationRecords: EducationRecordDto[]
  profilePhotoUrl: string | null
  profilePhotoPublicId: string | null
  admissionDate: Date | null
  source: StudentSource | null
  counsellorId: string | null
  notes: string | null
  tags: string[]
  profileCompletionPercentage: number
  profileCompletionStatus: ProfileCompletionStatus
  createdAt: Date
  updatedAt: Date
}

export interface AdminStudentListItemDto {
  id: string
  userId: string
  studentId: string
  email: string
  status: UserStatus
  isDeleted: boolean
  firstName: string
  lastName: string
  middleName: string | null
  displayName: string | null
  phone: string | null
  address: StudentAddressDto | null
  admissionDate: Date | null
  gender: Gender | null
  source: StudentSource | null
  tags: string[]
  profileCompletionPercentage: number
  profileCompletionStatus: ProfileCompletionStatus
  profilePhotoUrl: string | null
  createdAt: Date
  updatedAt: Date
}

export interface StudentBulkActionResult {
  succeeded: string[]
  failed: { id: string; reason: string }[]
}

function toAddressDto(address: IAddress | null): StudentAddressDto | null {
  return address
    ? {
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
      }
    : null
}

/**
 * `{ ...contact }` on a Mongoose embedded subdocument does NOT produce a
 * clean plain object — it copies the subdocument's own enumerable
 * properties, which in Mongoose 9 includes internal bookkeeping
 * (`$__`, `_doc`, `$isNew`, `__parentArray`, `__index`, `$__parent`) right
 * alongside the real fields, leaking the entire parent document (and
 * Mongoose internals) through the public API response. Explicit field
 * mapping is the fix, same as `toAddressDto` above.
 */
function toEmergencyContactDto(contact: IEmergencyContact): EmergencyContactDto {
  return {
    name: contact.name,
    phone: contact.phone,
    relationship: contact.relationship,
    alternatePhone: contact.alternatePhone,
    email: contact.email,
  }
}

function toEducationRecordDto(record: IEducationRecord): EducationRecordDto {
  return {
    degree: record.degree,
    institution: record.institution,
    yearOfCompletion: record.yearOfCompletion,
    boardOrUniversity: record.boardOrUniversity,
    fieldOfStudy: record.fieldOfStudy,
    gradeValue: record.gradeValue,
    gradeType: record.gradeType,
    documentUrl: record.documentUrl,
    documentPublicId: record.documentPublicId,
  }
}

function toDto(student: StudentDocument, user: UserDocument): AdminStudentDto {
  return {
    id: student._id.toString(),
    userId: student.userId.toString(),
    studentId: student.studentId,
    email: user.email,
    status: user.status,
    isDeleted: user.isDeleted,
    emailVerifiedAt: user.emailVerifiedAt,
    lastLoginAt: user.lastLoginAt,
    firstName: student.firstName,
    middleName: student.middleName,
    lastName: student.lastName,
    displayName: student.displayName,
    dateOfBirth: student.dateOfBirth,
    gender: student.gender,
    preferredLanguage: student.preferredLanguage,
    phone: student.phone,
    alternatePhone: student.alternatePhone,
    address: toAddressDto(student.address),
    emergencyContacts: student.emergencyContacts.map(toEmergencyContactDto),
    guardianName: student.guardianName,
    guardianPhone: student.guardianPhone,
    guardianEmail: student.guardianEmail,
    guardianRelationship: student.guardianRelationship,
    guardianOccupation: student.guardianOccupation,
    guardianAddressSameAsStudent: student.guardianAddressSameAsStudent,
    guardianAddress: toAddressDto(student.guardianAddress),
    educationRecords: student.educationRecords.map(toEducationRecordDto),
    profilePhotoUrl: student.profilePhotoUrl,
    profilePhotoPublicId: student.profilePhotoPublicId,
    admissionDate: student.admissionDate,
    source: student.source,
    counsellorId: student.counsellorId ? student.counsellorId.toString() : null,
    notes: student.notes,
    tags: student.tags,
    profileCompletionPercentage: student.profileCompletionPercentage,
    profileCompletionStatus: student.profileCompletionStatus,
    createdAt: student.createdAt,
    updatedAt: student.updatedAt,
  }
}

function toListItemDto(row: StudentListRow): AdminStudentListItemDto {
  return {
    id: row._id.toString(),
    userId: row.userId.toString(),
    studentId: row.studentId,
    email: row.email,
    status: row.status,
    isDeleted: row.userIsDeleted,
    firstName: row.firstName,
    lastName: row.lastName,
    middleName: row.middleName,
    displayName: row.displayName,
    phone: row.phone,
    address: toAddressDto(row.address),
    admissionDate: row.admissionDate,
    gender: row.gender,
    source: row.source,
    tags: row.tags,
    profileCompletionPercentage: row.profileCompletionPercentage,
    profileCompletionStatus: row.profileCompletionStatus,
    profilePhotoUrl: row.profilePhotoUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

/**
 * Deterministic, server-only, five equally-weighted groups (20% each) —
 * never accepted as client input (absent from every Zod schema in
 * student.validator.ts). Emergency contact is required at creation
 * (min 1, Zod-enforced) so that group is close to always-complete in
 * practice; it stays in the calculation anyway so a future relaxation of
 * that requirement doesn't silently break the formula. See
 * ARCHITECTURE.md's Student Management section for the full rationale.
 */
function calculateProfileCompletion(data: {
  firstName: string
  lastName: string
  dateOfBirth: Date | null
  gender: Gender | null
  phone: string | null
  address: IAddress | null
  emergencyContacts: IEmergencyContact[]
  educationRecords: IEducationRecord[]
  profilePhotoUrl: string | null
}): { percentage: number; status: ProfileCompletionStatus } {
  const groups = [
    Boolean(data.firstName && data.lastName && data.dateOfBirth && data.gender),
    Boolean(data.phone && data.address),
    data.emergencyContacts.length > 0,
    data.educationRecords.length > 0,
    Boolean(data.profilePhotoUrl),
  ]

  const completedGroups = groups.filter(Boolean).length
  const percentage = Math.round((completedGroups / groups.length) * 100)
  const status: ProfileCompletionStatus =
    percentage === 100 ? 'COMPLETE' : percentage === 0 ? 'INCOMPLETE' : 'PARTIAL'

  return { percentage, status }
}

function buildDisplayName(
  firstName: string,
  middleName: string | undefined,
  lastName: string,
): string {
  return [firstName, middleName, lastName].filter(Boolean).join(' ')
}

function resolveGuardianAddress(input: {
  guardianAddressSameAsStudent: boolean
  guardianAddress: IAddress | null
  address: IAddress | null
}): IAddress | null {
  if (input.guardianAddressSameAsStudent) return input.address
  return input.guardianAddress
}

async function loadStudentWithUser(
  studentId: string,
): Promise<{ student: StudentDocument; user: UserDocument }> {
  const student = await studentRepository.findById(studentId)
  if (!student) {
    throw ApiError.notFound('Student not found')
  }
  const user = await userRepository.findByIdIncludingDeleted(student.userId.toString())
  if (!user) {
    throw ApiError.internal('The linked user account could not be resolved')
  }
  return { student, user }
}

export const studentManagementService = {
  async listStudents(
    filter: ListStudentsFilter,
    options: ListStudentsOptions,
  ): Promise<{ dtos: AdminStudentListItemDto[]; total: number }> {
    const { rows, total } = await studentRepository.list(filter, options)
    return { dtos: rows.map(toListItemDto), total }
  },

  async getStudentById(studentId: string): Promise<AdminStudentDto> {
    const { student, user } = await loadStudentWithUser(studentId)
    return toDto(student, user)
  },

  async createStudent(
    input: CreateStudentInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminStudentDto> {
    const studentRole = await roleRepository.findByName(STUDENT_ROLE)
    if (!studentRole) {
      throw ApiError.internal('STUDENT role not found — run the role seed script')
    }

    const existing = await userRepository.findByEmail(input.email)
    if (existing) {
      throw ApiError.conflict('A user with this email already exists')
    }

    const now = new Date()
    const user = await userRepository.create({
      email: input.email.toLowerCase(),
      passwordHash: await hashPassword(input.password),
      roleId: studentRole._id,
      status: input.sendInvitation ? 'PENDING_VERIFICATION' : 'ACTIVE',
      emailVerifiedAt: input.sendInvitation ? null : now,
      createdBy: new Types.ObjectId(actor.id),
      updatedBy: new Types.ObjectId(actor.id),
    })

    const address: IAddress = { line2: null, ...input.address }
    const guardianAddress = resolveGuardianAddress({
      guardianAddressSameAsStudent: input.guardianAddressSameAsStudent,
      guardianAddress: input.guardianAddress ? { line2: null, ...input.guardianAddress } : null,
      address,
    })
    const emergencyContacts: IEmergencyContact[] = input.emergencyContacts.map((contact) => ({
      alternatePhone: null,
      email: null,
      ...contact,
    }))
    const educationRecords: IEducationRecord[] = input.educationRecords.map((record) => ({
      boardOrUniversity: null,
      fieldOfStudy: null,
      gradeValue: null,
      gradeType: null,
      documentUrl: null,
      documentPublicId: null,
      ...record,
    }))
    const { percentage, status } = calculateProfileCompletion({
      firstName: input.firstName,
      lastName: input.lastName,
      dateOfBirth: input.dateOfBirth,
      gender: input.gender ?? null,
      phone: input.phone,
      address,
      emergencyContacts,
      educationRecords,
      profilePhotoUrl: null,
    })

    let student: StudentDocument
    try {
      student = await studentRepository.create({
        userId: user._id,
        studentId: await generateStudentId(),
        firstName: input.firstName,
        middleName: input.middleName ?? null,
        lastName: input.lastName,
        displayName:
          input.displayName ?? buildDisplayName(input.firstName, input.middleName, input.lastName),
        dateOfBirth: input.dateOfBirth,
        gender: input.gender ?? null,
        preferredLanguage: input.preferredLanguage ?? null,
        phone: input.phone,
        alternatePhone: input.alternatePhone ?? null,
        address,
        emergencyContacts,
        guardianName: input.guardianName ?? null,
        guardianPhone: input.guardianPhone ?? null,
        guardianEmail: input.guardianEmail ?? null,
        guardianRelationship: input.guardianRelationship ?? null,
        guardianOccupation: input.guardianOccupation ?? null,
        guardianAddressSameAsStudent: input.guardianAddressSameAsStudent,
        guardianAddress,
        educationRecords,
        admissionDate: input.admissionDate ?? now,
        source: input.source ?? null,
        counsellorId: input.counsellorId ? new Types.ObjectId(input.counsellorId) : null,
        notes: input.notes ?? null,
        tags: input.tags,
        profileCompletionPercentage: percentage,
        profileCompletionStatus: status,
        createdBy: new Types.ObjectId(actor.id),
        updatedBy: new Types.ObjectId(actor.id),
      })
    } catch (error) {
      // No multi-document transaction available in the current deployment
      // target (mongodb-memory-server runs standalone in tests; Atlas
      // support is not yet configured for it either) — compensate instead
      // by hard-deleting the just-created user. Safe because no client has
      // ever seen this record (no session was issued, no email sent yet)
      // and the ONLY way to reach this branch is `studentRepository.create`
      // itself throwing (e.g. the studentId uniqueness race, in principle
      // impossible given the atomic counter, or a validation edge case).
      await UserModel.deleteOne({ _id: user._id })
      throw error
    }

    if (input.sendInvitation) {
      const { raw, hash } = generateOpaqueTokenPair()
      await userRepository.updateById(user._id.toString(), {
        emailVerificationTokenHash: hash,
        emailVerificationTokenExpiresAt: minutesFromNow(env.EMAIL_VERIFICATION_TOKEN_TTL_MIN),
      })
      await enqueueAuthEmail('email-verification', {
        email: user.email,
        link: `${env.FRONTEND_URL}/verify-email?token=${raw}`,
      })
    }

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'student.created',
      entityType: 'student',
      entityId: student._id,
      metadata: { studentId: student.studentId, email: user.email },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return toDto(student, user)
  },

  async updateStudent(
    studentId: string,
    input: UpdateStudentInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminStudentDto> {
    const { student, user } = await loadStudentWithUser(studentId)

    const merged = {
      firstName: input.firstName ?? student.firstName,
      middleName: input.middleName ?? student.middleName,
      lastName: input.lastName ?? student.lastName,
      dateOfBirth: input.dateOfBirth ?? student.dateOfBirth,
      gender: input.gender ?? student.gender,
      phone: input.phone ?? student.phone,
      address: input.address ? { line2: null, ...input.address } : student.address,
      emergencyContacts: input.emergencyContacts
        ? input.emergencyContacts.map((contact) => ({
            alternatePhone: null,
            email: null,
            ...contact,
          }))
        : student.emergencyContacts,
      educationRecords: input.educationRecords
        ? input.educationRecords.map((record) => ({
            boardOrUniversity: null,
            fieldOfStudy: null,
            gradeValue: null,
            gradeType: null,
            documentUrl: null,
            documentPublicId: null,
            ...record,
          }))
        : student.educationRecords,
    }

    const { percentage, status } = calculateProfileCompletion({
      firstName: merged.firstName,
      lastName: merged.lastName,
      dateOfBirth: merged.dateOfBirth,
      gender: merged.gender,
      phone: merged.phone,
      address: merged.address,
      emergencyContacts: merged.emergencyContacts,
      educationRecords: merged.educationRecords,
      profilePhotoUrl: student.profilePhotoUrl,
    })

    const update: Record<string, unknown> = {
      ...merged,
      updatedBy: actor.id,
      profileCompletionPercentage: percentage,
      profileCompletionStatus: status,
    }
    if (input.displayName !== undefined) update.displayName = input.displayName
    if (input.preferredLanguage !== undefined) update.preferredLanguage = input.preferredLanguage
    if (input.alternatePhone !== undefined) update.alternatePhone = input.alternatePhone
    if (input.guardianName !== undefined) update.guardianName = input.guardianName
    if (input.guardianPhone !== undefined) update.guardianPhone = input.guardianPhone
    if (input.guardianEmail !== undefined) update.guardianEmail = input.guardianEmail
    if (input.guardianRelationship !== undefined)
      update.guardianRelationship = input.guardianRelationship
    if (input.guardianOccupation !== undefined) update.guardianOccupation = input.guardianOccupation
    if (input.admissionDate !== undefined) update.admissionDate = input.admissionDate
    if (input.source !== undefined) update.source = input.source
    if (input.counsellorId !== undefined) {
      update.counsellorId = input.counsellorId ? new Types.ObjectId(input.counsellorId) : null
    }
    if (input.notes !== undefined) update.notes = input.notes
    if (input.tags !== undefined) update.tags = input.tags
    if (input.guardianAddressSameAsStudent !== undefined || input.guardianAddress !== undefined) {
      const guardianAddressSameAsStudent =
        input.guardianAddressSameAsStudent ?? student.guardianAddressSameAsStudent
      update.guardianAddressSameAsStudent = guardianAddressSameAsStudent
      update.guardianAddress = resolveGuardianAddress({
        guardianAddressSameAsStudent,
        guardianAddress: input.guardianAddress ? { line2: null, ...input.guardianAddress } : null,
        address: merged.address,
      })
    }

    const updated = await studentRepository.updateById(studentId, update)
    if (!updated) {
      throw ApiError.notFound('Student not found')
    }

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'student.updated',
      entityType: 'student',
      entityId: updated._id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return toDto(updated, user)
  },

  async activateStudent(
    studentId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminStudentDto> {
    const { student, user } = await loadStudentWithUser(studentId)

    const updatedUser = await userRepository.updateById(user._id.toString(), {
      status: 'ACTIVE',
      failedLoginAttempts: 0,
      lockedUntil: null,
      updatedBy: actor.id,
    })
    if (!updatedUser) {
      throw ApiError.notFound('Student not found')
    }

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'student.activated',
      entityType: 'student',
      entityId: student._id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return toDto(student, updatedUser)
  },

  async deactivateStudent(
    studentId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminStudentDto> {
    const { student, user } = await loadStudentWithUser(studentId)

    const updatedUser = await userRepository.updateById(user._id.toString(), {
      status: 'DEACTIVATED',
      updatedBy: actor.id,
    })
    if (!updatedUser) {
      throw ApiError.notFound('Student not found')
    }
    await userSessionRepository.revokeAllForUser(user._id.toString())

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'student.deactivated',
      entityType: 'student',
      entityId: student._id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return toDto(student, updatedUser)
  },

  /**
   * Soft-deletes the linked *user* (auth identity) — deliberately does NOT
   * touch the student profile's own `isDeleted` (DATABASE.md §3.2: the
   * profile stays alive so enrollment/attendance/grade records that
   * reference this `Student._id` never dangle). The list/export query
   * therefore filters "deleted" on `user.isDeleted`, not the student
   * document's own flag — see student.repository.ts.
   */
  async softDeleteStudent(
    studentId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<void> {
    const { student, user } = await loadStudentWithUser(studentId)

    /** Phase 10B guard — never soft-delete a student's account while they hold a live (non-terminal) enrollment; enrollment history must never be orphaned or cascade-deleted. */
    if (await enrollmentRepository.existsNonTerminalForStudent(student._id.toString())) {
      throw ApiError.conflict(
        'This student has an active enrollment and cannot be deleted — cancel or complete it first',
      )
    }

    await userRepository.softDeleteById(user._id.toString(), actor.id)
    await userSessionRepository.revokeAllForUser(user._id.toString())

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'student.soft_deleted',
      entityType: 'student',
      entityId: student._id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  },

  async restoreStudent(
    studentId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminStudentDto> {
    const { student, user } = await loadStudentWithUser(studentId)
    if (!user.isDeleted) {
      throw ApiError.unprocessable('This student is not deleted.')
    }

    const restoredUser = await userRepository.restoreById(user._id.toString(), actor.id)
    if (!restoredUser) {
      throw ApiError.notFound('Student not found')
    }

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'student.restored',
      entityType: 'student',
      entityId: student._id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return toDto(student, restoredUser)
  },

  async resendInvitation(
    studentId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<void> {
    const { student, user } = await loadStudentWithUser(studentId)
    if (user.status !== 'PENDING_VERIFICATION') {
      throw ApiError.unprocessable('This student is already verified.')
    }

    const { raw, hash } = generateOpaqueTokenPair()
    await userRepository.updateById(user._id.toString(), {
      emailVerificationTokenHash: hash,
      emailVerificationTokenExpiresAt: minutesFromNow(env.EMAIL_VERIFICATION_TOKEN_TTL_MIN),
    })
    await enqueueAuthEmail('email-verification', {
      email: user.email,
      link: `${env.FRONTEND_URL}/verify-email?token=${raw}`,
    })

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'student.invitation_resent',
      entityType: 'student',
      entityId: student._id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  },

  async listSessions(studentId: string) {
    const { user } = await loadStudentWithUser(studentId)
    const sessions = await userSessionRepository.findActiveByUserId(user._id.toString())
    return sessions.map((session) => ({
      id: session._id.toString(),
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      lastUsedAt: session.lastUsedAt,
      createdAt: session.createdAt,
    }))
  },

  async forceLogoutSession(
    studentId: string,
    sessionId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<void> {
    const { student, user } = await loadStudentWithUser(studentId)
    const session = await userSessionRepository.findActiveById(sessionId)
    if (session?.userId.toString() !== user._id.toString()) {
      throw ApiError.notFound('Session not found')
    }

    await userSessionRepository.revokeById(sessionId)

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'student.session.force_revoked',
      entityType: 'student',
      entityId: student._id,
      metadata: { sessionId },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  },

  async forceLogoutAll(
    studentId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<void> {
    const { student, user } = await loadStudentWithUser(studentId)
    await userSessionRepository.revokeAllForUser(user._id.toString())

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'student.logout_all_forced',
      entityType: 'student',
      entityId: student._id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  },

  async bulkAction(
    action: StudentBulkAction,
    studentIds: string[],
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<StudentBulkActionResult> {
    const result: StudentBulkActionResult = { succeeded: [], failed: [] }

    for (const id of studentIds) {
      try {
        if (action === 'activate') {
          await studentManagementService.activateStudent(id, actor, context)
        } else if (action === 'deactivate') {
          await studentManagementService.deactivateStudent(id, actor, context)
        } else if (action === 'restore') {
          await studentManagementService.restoreStudent(id, actor, context)
        } else {
          await studentManagementService.softDeleteStudent(id, actor, context)
        }
        result.succeeded.push(id)
      } catch (error) {
        result.failed.push({
          id,
          reason: error instanceof ApiError ? error.message : 'Unexpected error',
        })
      }
    }

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'student.bulk_action',
      entityType: 'student',
      entityId: actor.id,
      metadata: { action, requested: studentIds.length, succeeded: result.succeeded.length },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return result
  },

  async exportStudentsCsv(
    filter: ListStudentsFilter,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<string> {
    const rows = await studentRepository.listAllForExport(filter, MAX_EXPORT_ROWS)

    const columns = [
      'studentId',
      'fullName',
      'email',
      'phone',
      'gender',
      'admissionDate',
      'city',
      'state',
      'profileCompletionStatus',
      'accountStatus',
      'isDeleted',
      'createdAt',
    ] as const

    const csvRows = rows.map((row) => [
      row.studentId,
      row.displayName ?? `${row.firstName} ${row.lastName}`,
      row.email,
      row.phone ?? '',
      row.gender ?? '',
      row.admissionDate?.toISOString() ?? '',
      row.address?.city ?? '',
      row.address?.state ?? '',
      row.profileCompletionStatus,
      row.status,
      String(row.userIsDeleted),
      row.createdAt.toISOString(),
    ])

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'student.exported',
      entityType: 'student',
      entityId: actor.id,
      metadata: { rowCount: rows.length },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return toCsv(columns, csvRows)
  },

  async getAuditTimeline(studentId: string, page: number, limit: number) {
    const { entries, total } = await auditLogRepository.findByEntity(
      'student',
      studentId,
      page,
      limit,
    )
    return {
      entries: entries.map((entry) => ({
        id: entry._id.toString(),
        actorId: entry.actorId ? entry.actorId.toString() : null,
        actorRole: entry.actorRole,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId.toString(),
        metadata: entry.metadata,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        createdAt: entry.createdAt,
      })),
      total,
    }
  },

  async getPhotoUploadSignature(studentId: string): Promise<SignedUploadParams> {
    const student = await studentRepository.findById(studentId)
    if (!student) {
      throw ApiError.notFound('Student not found')
    }

    const folder = `daisy-minds/students/${studentId}`
    const publicId = `${folder}/profile-${String(Date.now())}`
    return generateSignedUploadParams(folder, publicId)
  },

  async confirmPhoto(
    studentId: string,
    publicId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminStudentDto> {
    const { student, user } = await loadStudentWithUser(studentId)
    const folder = `daisy-minds/students/${studentId}`
    const { secureUrl } = await verifyUploadedAsset(publicId, folder)

    const previousPublicId = student.profilePhotoPublicId
    const { percentage, status } = calculateProfileCompletion({
      firstName: student.firstName,
      lastName: student.lastName,
      dateOfBirth: student.dateOfBirth,
      gender: student.gender,
      phone: student.phone,
      address: student.address,
      emergencyContacts: student.emergencyContacts,
      educationRecords: student.educationRecords,
      profilePhotoUrl: secureUrl,
    })

    const updated = await studentRepository.updateById(studentId, {
      profilePhotoUrl: secureUrl,
      profilePhotoPublicId: publicId,
      profileCompletionPercentage: percentage,
      profileCompletionStatus: status,
      updatedBy: actor.id,
    })
    if (!updated) {
      throw ApiError.notFound('Student not found')
    }

    if (previousPublicId) {
      await deleteAsset(previousPublicId)
    }

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'student.photo_changed',
      entityType: 'student',
      entityId: updated._id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return toDto(updated, user)
  },

  async removePhoto(
    studentId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminStudentDto> {
    const { student, user } = await loadStudentWithUser(studentId)
    if (!student.profilePhotoPublicId) {
      throw ApiError.unprocessable('This student has no profile photo to remove.')
    }

    const { percentage, status } = calculateProfileCompletion({
      firstName: student.firstName,
      lastName: student.lastName,
      dateOfBirth: student.dateOfBirth,
      gender: student.gender,
      phone: student.phone,
      address: student.address,
      emergencyContacts: student.emergencyContacts,
      educationRecords: student.educationRecords,
      profilePhotoUrl: null,
    })

    const publicId = student.profilePhotoPublicId
    const updated = await studentRepository.updateById(studentId, {
      profilePhotoUrl: null,
      profilePhotoPublicId: null,
      profileCompletionPercentage: percentage,
      profileCompletionStatus: status,
      updatedBy: actor.id,
    })
    if (!updated) {
      throw ApiError.notFound('Student not found')
    }
    await deleteAsset(publicId)

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'student.photo_removed',
      entityType: 'student',
      entityId: updated._id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return toDto(updated, user)
  },
}
