import { Types } from 'mongoose'

import { ApiError } from '../utils/api-error'
import { minutesFromNow } from '../utils/duration'
import { toCsv } from '../utils/csv'
import { env } from '../config/env'
import { enqueueAuthEmail } from '../queues/auth-email.queue'
import { auditLogRepository } from '../repositories/audit-log.repository'
import { roleRepository } from '../repositories/role.repository'
import {
  trainerRepository,
  type ListTrainersFilter,
  type ListTrainersOptions,
  type TrainerListRow,
} from '../repositories/trainer.repository'
import { userRepository } from '../repositories/user.repository'
import { userSessionRepository } from '../repositories/user-session.repository'
import { hashPassword } from './password.service'
import { generateOpaqueTokenPair } from './token.service'
import { generateTrainerId } from './trainer-id.service'
import {
  deleteAsset,
  generateSignedUploadParams,
  verifyUploadedAsset,
  type SignedUploadParams,
} from './cloudinary-upload.service'
import { UserModel, type UserDocument, type UserStatus } from '../models/user.model'
import type {
  AvailabilityStatus,
  AvailabilitySlotType,
  DayOfWeek,
  EmploymentStatus,
  EmploymentType,
  Gender,
  IAddress,
  ICertification,
  IEmergencyContact,
  IQualification,
  IAvailabilitySlot,
  PreferredTimeSlot,
  ProfileCompletionStatus,
  TeachingLevel,
  TeachingMode,
  TrainerDocument,
  TrainerSource,
} from '../models/trainer.model'
import type {
  CreateTrainerInput,
  TrainerBulkAction,
  UpdateTrainerInput,
} from '../validators/trainer.validator'
import type { AuthenticatedUser } from '../types/auth'
import type { RequestContext } from './user-management.service'

const TRAINER_ROLE = 'TRAINER'
/** Hard cap on an unpaginated export — never load an unbounded result set. */
const MAX_EXPORT_ROWS = 5000

export interface AddressDto {
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

export interface QualificationDto {
  degree: string
  institution: string
  boardOrUniversity: string | null
  fieldOfStudy: string | null
  yearOfCompletion: number
  gradeValue: string | null
  gradeType: string | null
  documentUrl: string | null
  documentPublicId: string | null
}

export interface CertificationDto {
  name: string
  issuingOrganization: string
  credentialId: string | null
  issueDate: Date
  expiryDate: Date | null
  verificationUrl: string | null
  documentUrl: string | null
  documentPublicId: string | null
}

export interface AvailabilitySlotDto {
  dayOfWeek: DayOfWeek
  startTime: string
  endTime: string
  timeZone: string
  type: AvailabilitySlotType
  effectiveFrom: Date | null
  effectiveTo: Date | null
}

export interface TrainerDocumentDto {
  type: string
  url: string
  publicId: string | null
  uploadedAt: Date
}

export interface AdminTrainerDto {
  id: string
  userId: string
  trainerId: string
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
  bio: string
  phone: string | null
  alternatePhone: string | null
  address: AddressDto | null
  emergencyContacts: EmergencyContactDto[]
  designation: string | null
  department: string | null
  totalYearsExperience: number | null
  teachingYearsExperience: number | null
  industryYearsExperience: number | null
  expertiseAreas: string[]
  secondaryExpertise: string[]
  skills: string[]
  technologies: string[]
  specializations: string[]
  linkedinUrl: string | null
  portfolioUrl: string | null
  githubUrl: string | null
  websiteUrl: string | null
  qualifications: QualificationDto[]
  certifications: CertificationDto[]
  joiningDate: Date | null
  employmentType: EmploymentType | null
  employmentStatus: EmploymentStatus
  employeeCode: string | null
  reportingManagerId: string | null
  workLocation: string | null
  probationEndDate: Date | null
  noticePeriodDays: number | null
  preferredTeachingModes: TeachingMode[]
  preferredTimeSlots: PreferredTimeSlot[]
  maxConcurrentBatches: number | null
  maxWeeklyTeachingHours: number | null
  availabilityStatus: AvailabilityStatus
  availabilityNotes: string | null
  languagesOfInstruction: string[]
  teachingLevel: TeachingLevel | null
  qualifiedToTeachSubjects: string[]
  availability: AvailabilitySlotDto[]
  documents: TrainerDocumentDto[]
  profilePhotoUrl: string | null
  profilePhotoPublicId: string | null
  source: TrainerSource | null
  notes: string | null
  tags: string[]
  profileCompletionPercentage: number
  profileCompletionStatus: ProfileCompletionStatus
  createdAt: Date
  updatedAt: Date
}

export interface AdminTrainerListItemDto {
  id: string
  userId: string
  trainerId: string
  email: string
  status: UserStatus
  isDeleted: boolean
  firstName: string
  lastName: string
  middleName: string | null
  displayName: string | null
  designation: string | null
  department: string | null
  expertiseAreas: string[]
  totalYearsExperience: number | null
  employmentType: EmploymentType | null
  employmentStatus: EmploymentStatus
  availabilityStatus: AvailabilityStatus
  profileCompletionPercentage: number
  profileCompletionStatus: ProfileCompletionStatus
  profilePhotoUrl: string | null
  createdAt: Date
  updatedAt: Date
}

export interface TrainerBulkActionResult {
  succeeded: string[]
  failed: { id: string; reason: string }[]
}

function toAddressDto(address: IAddress | null): AddressDto | null {
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
 * `{ ...item }` on a Mongoose embedded subdocument does NOT produce a clean
 * plain object — it copies internal bookkeeping properties too ($__, _doc,
 * $isNew, __parentArray, __index, $__parent), leaking the entire parent
 * document through the API response. Explicit field mapping is required for
 * every embedded-array field below — this was a real, shipped bug in the
 * students module (student-management.service.ts) fixed after being caught
 * in manual testing; trainers never has the bug in the first place.
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

function toQualificationDto(qualification: IQualification): QualificationDto {
  return {
    degree: qualification.degree,
    institution: qualification.institution,
    boardOrUniversity: qualification.boardOrUniversity,
    fieldOfStudy: qualification.fieldOfStudy,
    yearOfCompletion: qualification.yearOfCompletion,
    gradeValue: qualification.gradeValue,
    gradeType: qualification.gradeType,
    documentUrl: qualification.documentUrl,
    documentPublicId: qualification.documentPublicId,
  }
}

function toCertificationDto(certification: ICertification): CertificationDto {
  return {
    name: certification.name,
    issuingOrganization: certification.issuingOrganization,
    credentialId: certification.credentialId,
    issueDate: certification.issueDate,
    expiryDate: certification.expiryDate,
    verificationUrl: certification.verificationUrl,
    documentUrl: certification.documentUrl,
    documentPublicId: certification.documentPublicId,
  }
}

function toAvailabilitySlotDto(slot: IAvailabilitySlot): AvailabilitySlotDto {
  return {
    dayOfWeek: slot.dayOfWeek,
    startTime: slot.startTime,
    endTime: slot.endTime,
    timeZone: slot.timeZone,
    type: slot.type,
    effectiveFrom: slot.effectiveFrom,
    effectiveTo: slot.effectiveTo,
  }
}

function toDto(trainer: TrainerDocument, user: UserDocument): AdminTrainerDto {
  return {
    id: trainer._id.toString(),
    userId: trainer.userId.toString(),
    trainerId: trainer.trainerId,
    email: user.email,
    status: user.status,
    isDeleted: user.isDeleted,
    emailVerifiedAt: user.emailVerifiedAt,
    lastLoginAt: user.lastLoginAt,
    firstName: trainer.firstName,
    middleName: trainer.middleName,
    lastName: trainer.lastName,
    displayName: trainer.displayName,
    dateOfBirth: trainer.dateOfBirth,
    gender: trainer.gender,
    preferredLanguage: trainer.preferredLanguage,
    bio: trainer.bio,
    phone: trainer.phone,
    alternatePhone: trainer.alternatePhone,
    address: toAddressDto(trainer.address),
    emergencyContacts: trainer.emergencyContacts.map(toEmergencyContactDto),
    designation: trainer.designation,
    department: trainer.department,
    totalYearsExperience: trainer.totalYearsExperience,
    teachingYearsExperience: trainer.teachingYearsExperience,
    industryYearsExperience: trainer.industryYearsExperience,
    expertiseAreas: trainer.expertiseAreas,
    secondaryExpertise: trainer.secondaryExpertise,
    skills: trainer.skills,
    technologies: trainer.technologies,
    specializations: trainer.specializations,
    linkedinUrl: trainer.linkedinUrl,
    portfolioUrl: trainer.portfolioUrl,
    githubUrl: trainer.githubUrl,
    websiteUrl: trainer.websiteUrl,
    qualifications: trainer.qualifications.map(toQualificationDto),
    certifications: trainer.certifications.map(toCertificationDto),
    joiningDate: trainer.joiningDate,
    employmentType: trainer.employmentType,
    employmentStatus: trainer.employmentStatus,
    employeeCode: trainer.employeeCode,
    reportingManagerId: trainer.reportingManagerId ? trainer.reportingManagerId.toString() : null,
    workLocation: trainer.workLocation,
    probationEndDate: trainer.probationEndDate,
    noticePeriodDays: trainer.noticePeriodDays,
    preferredTeachingModes: trainer.preferredTeachingModes,
    preferredTimeSlots: trainer.preferredTimeSlots,
    maxConcurrentBatches: trainer.maxConcurrentBatches,
    maxWeeklyTeachingHours: trainer.maxWeeklyTeachingHours,
    availabilityStatus: trainer.availabilityStatus,
    availabilityNotes: trainer.availabilityNotes,
    languagesOfInstruction: trainer.languagesOfInstruction,
    teachingLevel: trainer.teachingLevel,
    qualifiedToTeachSubjects: trainer.qualifiedToTeachSubjects,
    availability: trainer.availability.map(toAvailabilitySlotDto),
    documents: trainer.documents.map((document) => ({
      type: document.type,
      url: document.url,
      publicId: document.publicId,
      uploadedAt: document.uploadedAt,
    })),
    profilePhotoUrl: trainer.profilePhotoUrl,
    profilePhotoPublicId: trainer.profilePhotoPublicId,
    source: trainer.source,
    notes: trainer.notes,
    tags: trainer.tags,
    profileCompletionPercentage: trainer.profileCompletionPercentage,
    profileCompletionStatus: trainer.profileCompletionStatus,
    createdAt: trainer.createdAt,
    updatedAt: trainer.updatedAt,
  }
}

function toListItemDto(row: TrainerListRow): AdminTrainerListItemDto {
  return {
    id: row._id.toString(),
    userId: row.userId.toString(),
    trainerId: row.trainerId,
    email: row.email,
    status: row.status,
    isDeleted: row.userIsDeleted,
    firstName: row.firstName,
    lastName: row.lastName,
    middleName: row.middleName,
    displayName: row.displayName,
    designation: row.designation,
    department: row.department,
    expertiseAreas: row.expertiseAreas,
    totalYearsExperience: row.totalYearsExperience,
    employmentType: row.employmentType,
    employmentStatus: row.employmentStatus,
    availabilityStatus: row.availabilityStatus,
    profileCompletionPercentage: row.profileCompletionPercentage,
    profileCompletionStatus: row.profileCompletionStatus,
    profilePhotoUrl: row.profilePhotoUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

/**
 * Deterministic, server-only, seven equally-weighted groups (~14.3% each) —
 * never accepted as client input (absent from every Zod schema in
 * trainer.validator.ts). See ARCHITECTURE.md's Trainer Management section.
 */
function calculateProfileCompletion(data: {
  firstName: string
  lastName: string
  dateOfBirth: Date | null
  gender: Gender | null
  phone: string | null
  address: IAddress | null
  designation: string | null
  department: string | null
  expertiseAreas: string[]
  qualifications: IQualification[]
  certifications: ICertification[]
  joiningDate: Date | null
  employmentType: EmploymentType | null
  availability: IAvailabilitySlot[]
  profilePhotoUrl: string | null
}): { percentage: number; status: ProfileCompletionStatus } {
  const groups = [
    Boolean(data.firstName && data.lastName && data.dateOfBirth && data.gender),
    Boolean(data.phone && data.address),
    Boolean(data.designation && data.department && data.expertiseAreas.length > 0),
    data.qualifications.length > 0 || data.certifications.length > 0,
    Boolean(data.joiningDate && data.employmentType),
    data.availability.length > 0,
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

async function loadTrainerWithUser(
  trainerId: string,
): Promise<{ trainer: TrainerDocument; user: UserDocument }> {
  const trainer = await trainerRepository.findById(trainerId)
  if (!trainer) {
    throw ApiError.notFound('Trainer not found')
  }
  const user = await userRepository.findByIdIncludingDeleted(trainer.userId.toString())
  if (!user) {
    throw ApiError.internal('The linked user account could not be resolved')
  }
  return { trainer, user }
}

function toEmergencyContacts(
  input: CreateTrainerInput['emergencyContacts'] | UpdateTrainerInput['emergencyContacts'],
): IEmergencyContact[] {
  return (input ?? []).map((contact) => ({ alternatePhone: null, email: null, ...contact }))
}

function toQualifications(
  input: CreateTrainerInput['qualifications'] | UpdateTrainerInput['qualifications'],
): IQualification[] {
  return (input ?? []).map((qualification) => ({
    boardOrUniversity: null,
    fieldOfStudy: null,
    gradeValue: null,
    gradeType: null,
    documentUrl: null,
    documentPublicId: null,
    ...qualification,
  }))
}

function toCertifications(
  input: CreateTrainerInput['certifications'] | UpdateTrainerInput['certifications'],
): ICertification[] {
  return (input ?? []).map((certification) => ({
    credentialId: null,
    expiryDate: null,
    verificationUrl: null,
    documentUrl: null,
    documentPublicId: null,
    ...certification,
  }))
}

function toAvailability(
  input: CreateTrainerInput['availability'] | UpdateTrainerInput['availability'],
): IAvailabilitySlot[] {
  return (input ?? []).map((slot) => ({
    effectiveFrom: null,
    effectiveTo: null,
    ...slot,
  }))
}

export const trainerManagementService = {
  async listTrainers(
    filter: ListTrainersFilter,
    options: ListTrainersOptions,
  ): Promise<{ dtos: AdminTrainerListItemDto[]; total: number }> {
    const { rows, total } = await trainerRepository.list(filter, options)
    return { dtos: rows.map(toListItemDto), total }
  },

  async getTrainerById(trainerId: string): Promise<AdminTrainerDto> {
    const { trainer, user } = await loadTrainerWithUser(trainerId)
    return toDto(trainer, user)
  },

  async createTrainer(
    input: CreateTrainerInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminTrainerDto> {
    const trainerRole = await roleRepository.findByName(TRAINER_ROLE)
    if (!trainerRole) {
      throw ApiError.internal('TRAINER role not found — run the role seed script')
    }

    const existing = await userRepository.findByEmail(input.email)
    if (existing) {
      throw ApiError.conflict('A user with this email already exists')
    }

    const now = new Date()
    const user = await userRepository.create({
      email: input.email.toLowerCase(),
      passwordHash: await hashPassword(input.password),
      roleId: trainerRole._id,
      status: input.sendInvitation ? 'PENDING_VERIFICATION' : 'ACTIVE',
      emailVerifiedAt: input.sendInvitation ? null : now,
      createdBy: new Types.ObjectId(actor.id),
      updatedBy: new Types.ObjectId(actor.id),
    })

    const address = input.address ? { line2: null, ...input.address } : null
    const emergencyContacts = toEmergencyContacts(input.emergencyContacts)
    const qualifications = toQualifications(input.qualifications)
    const certifications = toCertifications(input.certifications)
    const availability = toAvailability(input.availability)
    const { percentage, status } = calculateProfileCompletion({
      firstName: input.firstName,
      lastName: input.lastName,
      dateOfBirth: input.dateOfBirth ?? null,
      gender: input.gender ?? null,
      phone: input.phone,
      address,
      designation: input.designation ?? null,
      department: input.department ?? null,
      expertiseAreas: input.expertiseAreas,
      qualifications,
      certifications,
      joiningDate: input.joiningDate ?? null,
      employmentType: input.employmentType ?? null,
      availability,
      profilePhotoUrl: null,
    })

    let trainer: TrainerDocument
    try {
      trainer = await trainerRepository.create({
        userId: user._id,
        trainerId: await generateTrainerId(),
        firstName: input.firstName,
        middleName: input.middleName ?? null,
        lastName: input.lastName,
        displayName:
          input.displayName ?? buildDisplayName(input.firstName, input.middleName, input.lastName),
        dateOfBirth: input.dateOfBirth ?? null,
        gender: input.gender ?? null,
        preferredLanguage: input.preferredLanguage ?? null,
        bio: input.bio ?? '',
        phone: input.phone,
        alternatePhone: input.alternatePhone ?? null,
        address,
        emergencyContacts,
        designation: input.designation ?? null,
        department: input.department ?? null,
        totalYearsExperience: input.totalYearsExperience ?? null,
        teachingYearsExperience: input.teachingYearsExperience ?? null,
        industryYearsExperience: input.industryYearsExperience ?? null,
        expertiseAreas: input.expertiseAreas,
        secondaryExpertise: input.secondaryExpertise,
        skills: input.skills,
        technologies: input.technologies,
        specializations: input.specializations,
        linkedinUrl: input.linkedinUrl ?? null,
        portfolioUrl: input.portfolioUrl ?? null,
        githubUrl: input.githubUrl ?? null,
        websiteUrl: input.websiteUrl ?? null,
        qualifications,
        certifications,
        joiningDate: input.joiningDate ?? null,
        employmentType: input.employmentType ?? null,
        employmentStatus: input.employmentStatus,
        employeeCode: input.employeeCode ?? null,
        reportingManagerId: input.reportingManagerId
          ? new Types.ObjectId(input.reportingManagerId)
          : null,
        workLocation: input.workLocation ?? null,
        probationEndDate: input.probationEndDate ?? null,
        noticePeriodDays: input.noticePeriodDays ?? null,
        preferredTeachingModes: input.preferredTeachingModes,
        preferredTimeSlots: input.preferredTimeSlots,
        maxConcurrentBatches: input.maxConcurrentBatches ?? null,
        maxWeeklyTeachingHours: input.maxWeeklyTeachingHours ?? null,
        availabilityStatus: input.availabilityStatus,
        availabilityNotes: input.availabilityNotes ?? null,
        languagesOfInstruction: input.languagesOfInstruction,
        teachingLevel: input.teachingLevel ?? null,
        qualifiedToTeachSubjects: input.qualifiedToTeachSubjects,
        availability,
        source: input.source ?? null,
        notes: input.notes ?? null,
        tags: input.tags,
        profileCompletionPercentage: percentage,
        profileCompletionStatus: status,
        createdBy: new Types.ObjectId(actor.id),
        updatedBy: new Types.ObjectId(actor.id),
      })
    } catch (error) {
      // No multi-document transaction available in the current deployment
      // target — same compensating-cleanup approach as the students module
      // (student-management.service.ts#createStudent), for the same reason.
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
      action: 'trainer.created',
      entityType: 'trainer',
      entityId: trainer._id,
      metadata: { trainerId: trainer.trainerId, email: user.email },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return toDto(trainer, user)
  },

  async updateTrainer(
    trainerId: string,
    input: UpdateTrainerInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminTrainerDto> {
    const { trainer, user } = await loadTrainerWithUser(trainerId)

    const merged = {
      firstName: input.firstName ?? trainer.firstName,
      lastName: input.lastName ?? trainer.lastName,
      dateOfBirth: input.dateOfBirth ?? trainer.dateOfBirth,
      gender: input.gender ?? trainer.gender,
      phone: input.phone ?? trainer.phone,
      address: input.address ? { line2: null, ...input.address } : trainer.address,
      designation: input.designation ?? trainer.designation,
      department: input.department ?? trainer.department,
      expertiseAreas: input.expertiseAreas ?? trainer.expertiseAreas,
      qualifications: input.qualifications
        ? toQualifications(input.qualifications)
        : trainer.qualifications,
      certifications: input.certifications
        ? toCertifications(input.certifications)
        : trainer.certifications,
      joiningDate: input.joiningDate ?? trainer.joiningDate,
      employmentType: input.employmentType ?? trainer.employmentType,
      availability: input.availability ? toAvailability(input.availability) : trainer.availability,
    }

    const { percentage, status } = calculateProfileCompletion({
      ...merged,
      profilePhotoUrl: trainer.profilePhotoUrl,
    })

    const update: Record<string, unknown> = {
      ...merged,
      updatedBy: actor.id,
      profileCompletionPercentage: percentage,
      profileCompletionStatus: status,
    }
    if (input.middleName !== undefined) update.middleName = input.middleName
    if (input.displayName !== undefined) update.displayName = input.displayName
    if (input.preferredLanguage !== undefined) update.preferredLanguage = input.preferredLanguage
    if (input.bio !== undefined) update.bio = input.bio
    if (input.alternatePhone !== undefined) update.alternatePhone = input.alternatePhone
    if (input.emergencyContacts !== undefined)
      update.emergencyContacts = toEmergencyContacts(input.emergencyContacts)
    if (input.secondaryExpertise !== undefined) update.secondaryExpertise = input.secondaryExpertise
    if (input.skills !== undefined) update.skills = input.skills
    if (input.technologies !== undefined) update.technologies = input.technologies
    if (input.specializations !== undefined) update.specializations = input.specializations
    if (input.linkedinUrl !== undefined) update.linkedinUrl = input.linkedinUrl
    if (input.portfolioUrl !== undefined) update.portfolioUrl = input.portfolioUrl
    if (input.githubUrl !== undefined) update.githubUrl = input.githubUrl
    if (input.websiteUrl !== undefined) update.websiteUrl = input.websiteUrl
    if (input.employmentStatus !== undefined) update.employmentStatus = input.employmentStatus
    if (input.employeeCode !== undefined) update.employeeCode = input.employeeCode
    if (input.reportingManagerId !== undefined) {
      update.reportingManagerId = input.reportingManagerId
        ? new Types.ObjectId(input.reportingManagerId)
        : null
    }
    if (input.workLocation !== undefined) update.workLocation = input.workLocation
    if (input.probationEndDate !== undefined) update.probationEndDate = input.probationEndDate
    if (input.noticePeriodDays !== undefined) update.noticePeriodDays = input.noticePeriodDays
    if (input.preferredTeachingModes !== undefined)
      update.preferredTeachingModes = input.preferredTeachingModes
    if (input.preferredTimeSlots !== undefined) update.preferredTimeSlots = input.preferredTimeSlots
    if (input.maxConcurrentBatches !== undefined)
      update.maxConcurrentBatches = input.maxConcurrentBatches
    if (input.maxWeeklyTeachingHours !== undefined)
      update.maxWeeklyTeachingHours = input.maxWeeklyTeachingHours
    if (input.availabilityStatus !== undefined) update.availabilityStatus = input.availabilityStatus
    if (input.availabilityNotes !== undefined) update.availabilityNotes = input.availabilityNotes
    if (input.languagesOfInstruction !== undefined)
      update.languagesOfInstruction = input.languagesOfInstruction
    if (input.teachingLevel !== undefined) update.teachingLevel = input.teachingLevel
    if (input.qualifiedToTeachSubjects !== undefined)
      update.qualifiedToTeachSubjects = input.qualifiedToTeachSubjects
    if (input.source !== undefined) update.source = input.source
    if (input.notes !== undefined) update.notes = input.notes
    if (input.tags !== undefined) update.tags = input.tags
    if (input.totalYearsExperience !== undefined)
      update.totalYearsExperience = input.totalYearsExperience
    if (input.teachingYearsExperience !== undefined)
      update.teachingYearsExperience = input.teachingYearsExperience
    if (input.industryYearsExperience !== undefined)
      update.industryYearsExperience = input.industryYearsExperience

    const updated = await trainerRepository.updateById(trainerId, update)
    if (!updated) {
      throw ApiError.notFound('Trainer not found')
    }

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'trainer.updated',
      entityType: 'trainer',
      entityId: updated._id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    // Fine-grained audit entries required alongside the generic "updated"
    // event (SECURITY.md) — availability and employment-status changes are
    // significant enough to want their own searchable action, distinct from
    // an ordinary field edit.
    if (input.availability !== undefined) {
      await auditLogRepository.record({
        actorId: actor.id,
        actorRole: actor.role,
        action: 'trainer.availability_changed',
        entityType: 'trainer',
        entityId: updated._id,
        metadata: { slotCount: input.availability.length },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })
    }
    if (
      input.employmentStatus !== undefined &&
      input.employmentStatus !== trainer.employmentStatus
    ) {
      await auditLogRepository.record({
        actorId: actor.id,
        actorRole: actor.role,
        action: 'trainer.employment_status_changed',
        entityType: 'trainer',
        entityId: updated._id,
        metadata: { previousStatus: trainer.employmentStatus, newStatus: input.employmentStatus },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })
    }

    return toDto(updated, user)
  },

  async activateTrainer(
    trainerId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminTrainerDto> {
    const { trainer, user } = await loadTrainerWithUser(trainerId)

    const updatedUser = await userRepository.updateById(user._id.toString(), {
      status: 'ACTIVE',
      failedLoginAttempts: 0,
      lockedUntil: null,
      updatedBy: actor.id,
    })
    if (!updatedUser) {
      throw ApiError.notFound('Trainer not found')
    }

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'trainer.activated',
      entityType: 'trainer',
      entityId: trainer._id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return toDto(trainer, updatedUser)
  },

  async deactivateTrainer(
    trainerId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminTrainerDto> {
    const { trainer, user } = await loadTrainerWithUser(trainerId)

    const updatedUser = await userRepository.updateById(user._id.toString(), {
      status: 'DEACTIVATED',
      updatedBy: actor.id,
    })
    if (!updatedUser) {
      throw ApiError.notFound('Trainer not found')
    }
    await userSessionRepository.revokeAllForUser(user._id.toString())

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'trainer.deactivated',
      entityType: 'trainer',
      entityId: trainer._id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return toDto(trainer, updatedUser)
  },

  /**
   * Soft-deletes the linked *user* (auth identity) — deliberately does NOT
   * touch the trainer profile's own `isDeleted`, same rationale as the
   * students module: the profile stays alive so future course/batch history
   * referencing this `Trainer._id` never dangles.
   */
  async softDeleteTrainer(
    trainerId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<void> {
    const { trainer, user } = await loadTrainerWithUser(trainerId)

    await userRepository.softDeleteById(user._id.toString(), actor.id)
    await userSessionRepository.revokeAllForUser(user._id.toString())

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'trainer.soft_deleted',
      entityType: 'trainer',
      entityId: trainer._id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  },

  async restoreTrainer(
    trainerId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminTrainerDto> {
    const { trainer, user } = await loadTrainerWithUser(trainerId)
    if (!user.isDeleted) {
      throw ApiError.unprocessable('This trainer is not deleted.')
    }

    const restoredUser = await userRepository.restoreById(user._id.toString(), actor.id)
    if (!restoredUser) {
      throw ApiError.notFound('Trainer not found')
    }

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'trainer.restored',
      entityType: 'trainer',
      entityId: trainer._id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return toDto(trainer, restoredUser)
  },

  async resendInvitation(
    trainerId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<void> {
    const { trainer, user } = await loadTrainerWithUser(trainerId)
    if (user.status !== 'PENDING_VERIFICATION') {
      throw ApiError.unprocessable('This trainer is already verified.')
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
      action: 'trainer.invitation_resent',
      entityType: 'trainer',
      entityId: trainer._id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  },

  async listSessions(trainerId: string) {
    const { user } = await loadTrainerWithUser(trainerId)
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
    trainerId: string,
    sessionId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<void> {
    const { trainer, user } = await loadTrainerWithUser(trainerId)
    const session = await userSessionRepository.findActiveById(sessionId)
    if (session?.userId.toString() !== user._id.toString()) {
      throw ApiError.notFound('Session not found')
    }

    await userSessionRepository.revokeById(sessionId)

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'trainer.session.force_revoked',
      entityType: 'trainer',
      entityId: trainer._id,
      metadata: { sessionId },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  },

  async forceLogoutAll(
    trainerId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<void> {
    const { trainer, user } = await loadTrainerWithUser(trainerId)
    await userSessionRepository.revokeAllForUser(user._id.toString())

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'trainer.logout_all_forced',
      entityType: 'trainer',
      entityId: trainer._id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  },

  async bulkAction(
    action: TrainerBulkAction,
    trainerIds: string[],
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<TrainerBulkActionResult> {
    const result: TrainerBulkActionResult = { succeeded: [], failed: [] }

    for (const id of trainerIds) {
      try {
        if (action === 'activate') {
          await trainerManagementService.activateTrainer(id, actor, context)
        } else if (action === 'deactivate') {
          await trainerManagementService.deactivateTrainer(id, actor, context)
        } else if (action === 'restore') {
          await trainerManagementService.restoreTrainer(id, actor, context)
        } else {
          await trainerManagementService.softDeleteTrainer(id, actor, context)
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
      action: 'trainer.bulk_action',
      entityType: 'trainer',
      entityId: actor.id,
      metadata: { action, requested: trainerIds.length, succeeded: result.succeeded.length },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return result
  },

  async exportTrainersCsv(
    filter: ListTrainersFilter,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<string> {
    const rows = await trainerRepository.listAllForExport(filter, MAX_EXPORT_ROWS)

    const columns = [
      'trainerId',
      'fullName',
      'email',
      'designation',
      'department',
      'primaryExpertise',
      'yearsOfExperience',
      'employmentType',
      'employmentStatus',
      'accountStatus',
      'profileCompletionStatus',
    ] as const

    const csvRows = rows.map((row) => [
      row.trainerId,
      row.displayName ?? `${row.firstName} ${row.lastName}`,
      row.email,
      row.designation ?? '',
      row.department ?? '',
      row.expertiseAreas[0] ?? '',
      row.totalYearsExperience?.toString() ?? '',
      row.employmentType ?? '',
      row.employmentStatus,
      row.status,
      row.profileCompletionStatus,
    ])

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'trainer.exported',
      entityType: 'trainer',
      entityId: actor.id,
      metadata: { rowCount: rows.length },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return toCsv(columns, csvRows)
  },

  async getAuditTimeline(trainerId: string, page: number, limit: number) {
    const { entries, total } = await auditLogRepository.findByEntity(
      'trainer',
      trainerId,
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

  async getPhotoUploadSignature(trainerId: string): Promise<SignedUploadParams> {
    const trainer = await trainerRepository.findById(trainerId)
    if (!trainer) {
      throw ApiError.notFound('Trainer not found')
    }

    const folder = `daisy-minds/trainers/${trainerId}`
    const publicId = `${folder}/profile-${String(Date.now())}`
    return generateSignedUploadParams(folder, publicId)
  },

  async confirmPhoto(
    trainerId: string,
    publicId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminTrainerDto> {
    const { trainer, user } = await loadTrainerWithUser(trainerId)
    const folder = `daisy-minds/trainers/${trainerId}`
    const { secureUrl } = await verifyUploadedAsset(publicId, folder)

    const previousPublicId = trainer.profilePhotoPublicId
    const { percentage, status } = calculateProfileCompletion({
      firstName: trainer.firstName,
      lastName: trainer.lastName,
      dateOfBirth: trainer.dateOfBirth,
      gender: trainer.gender,
      phone: trainer.phone,
      address: trainer.address,
      designation: trainer.designation,
      department: trainer.department,
      expertiseAreas: trainer.expertiseAreas,
      qualifications: trainer.qualifications,
      certifications: trainer.certifications,
      joiningDate: trainer.joiningDate,
      employmentType: trainer.employmentType,
      availability: trainer.availability,
      profilePhotoUrl: secureUrl,
    })

    const updated = await trainerRepository.updateById(trainerId, {
      profilePhotoUrl: secureUrl,
      profilePhotoPublicId: publicId,
      profileCompletionPercentage: percentage,
      profileCompletionStatus: status,
      updatedBy: actor.id,
    })
    if (!updated) {
      throw ApiError.notFound('Trainer not found')
    }

    if (previousPublicId) {
      await deleteAsset(previousPublicId)
    }

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'trainer.photo_changed',
      entityType: 'trainer',
      entityId: updated._id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return toDto(updated, user)
  },

  async removePhoto(
    trainerId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<AdminTrainerDto> {
    const { trainer, user } = await loadTrainerWithUser(trainerId)
    if (!trainer.profilePhotoPublicId) {
      throw ApiError.unprocessable('This trainer has no profile photo to remove.')
    }

    const { percentage, status } = calculateProfileCompletion({
      firstName: trainer.firstName,
      lastName: trainer.lastName,
      dateOfBirth: trainer.dateOfBirth,
      gender: trainer.gender,
      phone: trainer.phone,
      address: trainer.address,
      designation: trainer.designation,
      department: trainer.department,
      expertiseAreas: trainer.expertiseAreas,
      qualifications: trainer.qualifications,
      certifications: trainer.certifications,
      joiningDate: trainer.joiningDate,
      employmentType: trainer.employmentType,
      availability: trainer.availability,
      profilePhotoUrl: null,
    })

    const publicId = trainer.profilePhotoPublicId
    const updated = await trainerRepository.updateById(trainerId, {
      profilePhotoUrl: null,
      profilePhotoPublicId: null,
      profileCompletionPercentage: percentage,
      profileCompletionStatus: status,
      updatedBy: actor.id,
    })
    if (!updated) {
      throw ApiError.notFound('Trainer not found')
    }
    await deleteAsset(publicId)

    await auditLogRepository.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'trainer.photo_removed',
      entityType: 'trainer',
      entityId: updated._id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return toDto(updated, user)
  },
}
