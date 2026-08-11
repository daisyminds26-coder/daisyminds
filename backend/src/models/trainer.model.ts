import type { Types } from 'mongoose'
import { Schema, model, type HydratedDocument } from 'mongoose'

import { applyAuditPlugin, auditFieldsDefinition } from './plugins/audit-fields.plugin'
import type { AuditFields } from './shared/audit-fields.type'

export const GENDERS = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'] as const
export type Gender = (typeof GENDERS)[number]

export const GRADE_TYPES = ['PERCENTAGE', 'CGPA', 'GRADE'] as const
export type GradeType = (typeof GRADE_TYPES)[number]

export const EMPLOYMENT_TYPES = [
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'VISITING',
  'FREELANCE',
] as const
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number]

export const EMPLOYMENT_STATUSES = ['ACTIVE', 'ON_LEAVE', 'INACTIVE', 'TERMINATED'] as const
export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number]

/** Mirrors `batch.model.ts#BATCH_MODES` by value, defined locally rather than imported — trainers and batches are separate module boundaries, and batch assignment is explicitly out of scope this phase. */
export const TEACHING_MODES = ['ONLINE', 'OFFLINE', 'HYBRID'] as const
export type TeachingMode = (typeof TEACHING_MODES)[number]

export const PREFERRED_TIME_SLOTS = ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'] as const
export type PreferredTimeSlot = (typeof PREFERRED_TIME_SLOTS)[number]

export const TEACHING_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS'] as const
export type TeachingLevel = (typeof TEACHING_LEVELS)[number]

export const AVAILABILITY_STATUSES = ['AVAILABLE', 'LIMITED', 'UNAVAILABLE'] as const
export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number]

export const DAYS_OF_WEEK = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number]

/** `AVAILABLE`/`PREFERRED` are the trainer's own signal of when they can/like to teach; `BLOCKED` is an explicit carve-out (e.g. a standing weekly commitment elsewhere) — see the non-overlap rule in trainer.validator.ts. */
export const AVAILABILITY_SLOT_TYPES = ['AVAILABLE', 'PREFERRED', 'BLOCKED'] as const
export type AvailabilitySlotType = (typeof AVAILABILITY_SLOT_TYPES)[number]

export const TRAINER_SOURCES = [
  'REFERRAL',
  'LINKEDIN',
  'JOB_PORTAL',
  'WALK_IN',
  'AGENCY',
  'OTHER',
] as const
export type TrainerSource = (typeof TRAINER_SOURCES)[number]

export const DOCUMENT_TYPES = [
  'RESUME',
  'CERTIFICATE',
  'EXPERIENCE_LETTER',
  'OFFER_LETTER',
  'OTHER',
] as const
export type TrainerDocumentType = (typeof DOCUMENT_TYPES)[number]

export const PROFILE_COMPLETION_STATUSES = ['INCOMPLETE', 'PARTIAL', 'COMPLETE'] as const
export type ProfileCompletionStatus = (typeof PROFILE_COMPLETION_STATUSES)[number]

export interface IAddress {
  line1: string
  line2: string | null
  city: string
  state: string
  postalCode: string
  country: string
}

export interface IEmergencyContact {
  name: string
  phone: string
  relationship: string
  alternatePhone: string | null
  email: string | null
}

export interface IQualification {
  degree: string
  institution: string
  boardOrUniversity: string | null
  fieldOfStudy: string | null
  yearOfCompletion: number
  gradeValue: string | null
  gradeType: GradeType | null
  documentUrl: string | null
  documentPublicId: string | null
}

export interface ICertification {
  name: string
  issuingOrganization: string
  credentialId: string | null
  issueDate: Date
  expiryDate: Date | null
  verificationUrl: string | null
  documentUrl: string | null
  documentPublicId: string | null
}

export interface IAvailabilitySlot {
  dayOfWeek: DayOfWeek
  /** 24h "HH:mm" — a plain time-of-day, deliberately not a `Date`, since a recurring weekly slot has no calendar date of its own. */
  startTime: string
  endTime: string
  /** IANA time zone identifier (e.g. `Asia/Kolkata`), validated against `Intl.supportedValuesOf('timeZone')` at the Zod layer. */
  timeZone: string
  type: AvailabilitySlotType
  effectiveFrom: Date | null
  effectiveTo: Date | null
}

export interface ITrainerDocument {
  type: TrainerDocumentType
  url: string
  publicId: string | null
  uploadedAt: Date
}

/**
 * 1:1 profile satellite to `users` (role = TRAINER) — split out for the same
 * reason as `students` (DATABASE.md §3.2): auth-hot-path reads never load
 * this larger payload. `assignedCourseIds` predates this phase (Phase 1
 * scaffold) and stays dormant here — course/batch assignment is explicitly
 * out of scope (ARCHITECTURE.md's Trainer Management section); the field is
 * neither read nor written by anything built in this phase.
 */
export interface ITrainer extends AuditFields {
  userId: Types.ObjectId
  trainerId: string
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
  address: IAddress | null
  emergencyContacts: IEmergencyContact[]

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

  qualifications: IQualification[]
  certifications: ICertification[]

  joiningDate: Date | null
  employmentType: EmploymentType | null
  employmentStatus: EmploymentStatus
  employeeCode: string | null
  reportingManagerId: Types.ObjectId | null
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
  availability: IAvailabilitySlot[]

  documents: ITrainerDocument[]
  profilePhotoUrl: string | null
  profilePhotoPublicId: string | null

  source: TrainerSource | null
  notes: string | null
  tags: string[]
  profileCompletionPercentage: number
  profileCompletionStatus: ProfileCompletionStatus

  /** Dormant — course/batch assignment is out of scope this phase; see the interface doc comment above. */
  assignedCourseIds: Types.ObjectId[]
}

export type TrainerDocument = HydratedDocument<ITrainer>

const addressSchema = new Schema<IAddress>(
  {
    line1: { type: String, required: true, trim: true, maxlength: 200 },
    line2: { type: String, default: null, trim: true, maxlength: 200 },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    state: { type: String, required: true, trim: true, maxlength: 100 },
    postalCode: { type: String, required: true, trim: true, maxlength: 20 },
    country: { type: String, required: true, trim: true, maxlength: 100 },
  },
  { _id: false },
)

const emergencyContactSchema = new Schema<IEmergencyContact>(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    relationship: { type: String, required: true, trim: true, maxlength: 60 },
    alternatePhone: { type: String, default: null, trim: true, maxlength: 20 },
    email: { type: String, default: null, trim: true, lowercase: true, maxlength: 254 },
  },
  { _id: false },
)

const qualificationSchema = new Schema<IQualification>(
  {
    degree: { type: String, required: true, trim: true, maxlength: 150 },
    institution: { type: String, required: true, trim: true, maxlength: 200 },
    boardOrUniversity: { type: String, default: null, trim: true, maxlength: 200 },
    fieldOfStudy: { type: String, default: null, trim: true, maxlength: 150 },
    yearOfCompletion: { type: Number, required: true, min: 1950, max: 2100 },
    gradeValue: { type: String, default: null, trim: true, maxlength: 20 },
    gradeType: { type: String, enum: GRADE_TYPES, default: null },
    documentUrl: { type: String, default: null },
    documentPublicId: { type: String, default: null },
  },
  { _id: false },
)

const certificationSchema = new Schema<ICertification>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    issuingOrganization: { type: String, required: true, trim: true, maxlength: 200 },
    credentialId: { type: String, default: null, trim: true, maxlength: 100 },
    issueDate: { type: Date, required: true },
    expiryDate: { type: Date, default: null },
    verificationUrl: { type: String, default: null, trim: true, maxlength: 500 },
    documentUrl: { type: String, default: null },
    documentPublicId: { type: String, default: null },
  },
  { _id: false },
)

const availabilitySlotSchema = new Schema<IAvailabilitySlot>(
  {
    dayOfWeek: { type: String, enum: DAYS_OF_WEEK, required: true },
    startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    endTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    timeZone: { type: String, required: true, maxlength: 60 },
    type: { type: String, enum: AVAILABILITY_SLOT_TYPES, default: 'AVAILABLE' },
    effectiveFrom: { type: Date, default: null },
    effectiveTo: { type: Date, default: null },
  },
  { _id: false },
)

const trainerDocumentSchema = new Schema<ITrainerDocument>(
  {
    type: { type: String, enum: DOCUMENT_TYPES, required: true },
    url: { type: String, required: true, trim: true },
    publicId: { type: String, default: null },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false },
)

const trainerSchema = new Schema<ITrainer>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  trainerId: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  firstName: { type: String, required: true, trim: true, maxlength: 100 },
  middleName: { type: String, default: null, trim: true, maxlength: 100 },
  lastName: { type: String, required: true, trim: true, maxlength: 100 },
  displayName: { type: String, default: null, trim: true, maxlength: 250 },
  dateOfBirth: { type: Date, default: null },
  gender: { type: String, enum: GENDERS, default: null },
  preferredLanguage: { type: String, default: null, trim: true, maxlength: 60 },
  bio: { type: String, default: '', trim: true, maxlength: 2000 },
  phone: { type: String, default: null, trim: true, maxlength: 20 },
  alternatePhone: { type: String, default: null, trim: true, maxlength: 20 },
  address: { type: addressSchema, default: null },
  emergencyContacts: { type: [emergencyContactSchema], default: [] },

  designation: { type: String, default: null, trim: true, maxlength: 150 },
  department: { type: String, default: null, trim: true, maxlength: 150 },
  totalYearsExperience: { type: Number, default: null, min: 0, max: 80 },
  teachingYearsExperience: { type: Number, default: null, min: 0, max: 80 },
  industryYearsExperience: { type: Number, default: null, min: 0, max: 80 },
  expertiseAreas: { type: [String], default: [] },
  secondaryExpertise: { type: [String], default: [] },
  skills: { type: [String], default: [] },
  technologies: { type: [String], default: [] },
  specializations: { type: [String], default: [] },
  linkedinUrl: { type: String, default: null, trim: true, maxlength: 500 },
  portfolioUrl: { type: String, default: null, trim: true, maxlength: 500 },
  githubUrl: { type: String, default: null, trim: true, maxlength: 500 },
  websiteUrl: { type: String, default: null, trim: true, maxlength: 500 },

  qualifications: { type: [qualificationSchema], default: [] },
  certifications: { type: [certificationSchema], default: [] },

  joiningDate: { type: Date, default: null },
  employmentType: { type: String, enum: EMPLOYMENT_TYPES, default: null },
  employmentStatus: { type: String, enum: EMPLOYMENT_STATUSES, default: 'ACTIVE' },
  employeeCode: { type: String, default: null, trim: true, maxlength: 60 },
  reportingManagerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  workLocation: { type: String, default: null, trim: true, maxlength: 200 },
  probationEndDate: { type: Date, default: null },
  noticePeriodDays: { type: Number, default: null, min: 0, max: 365 },

  preferredTeachingModes: { type: [String], enum: TEACHING_MODES, default: [] },
  preferredTimeSlots: { type: [String], enum: PREFERRED_TIME_SLOTS, default: [] },
  maxConcurrentBatches: { type: Number, default: null, min: 0, max: 50 },
  maxWeeklyTeachingHours: { type: Number, default: null, min: 0, max: 168 },
  availabilityStatus: { type: String, enum: AVAILABILITY_STATUSES, default: 'AVAILABLE' },
  availabilityNotes: { type: String, default: null, trim: true, maxlength: 1000 },
  languagesOfInstruction: { type: [String], default: [] },
  teachingLevel: { type: String, enum: TEACHING_LEVELS, default: null },
  qualifiedToTeachSubjects: { type: [String], default: [] },
  availability: { type: [availabilitySlotSchema], default: [] },

  documents: { type: [trainerDocumentSchema], default: [] },
  profilePhotoUrl: { type: String, default: null },
  profilePhotoPublicId: { type: String, default: null },

  source: { type: String, enum: TRAINER_SOURCES, default: null },
  notes: { type: String, default: null, trim: true, maxlength: 2000 },
  tags: { type: [String], default: [] },
  profileCompletionPercentage: { type: Number, default: 0, min: 0, max: 100 },
  profileCompletionStatus: {
    type: String,
    enum: PROFILE_COMPLETION_STATUSES,
    default: 'INCOMPLETE',
  },

  assignedCourseIds: { type: [Schema.Types.ObjectId], ref: 'Course', default: [] },

  ...auditFieldsDefinition,
})

applyAuditPlugin(trainerSchema)

trainerSchema.index({ userId: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } })
trainerSchema.index(
  { trainerId: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
)
trainerSchema.index({ expertiseAreas: 1 })
trainerSchema.index({ department: 1 })
trainerSchema.index({ employmentStatus: 1 })
trainerSchema.index({ tags: 1 })
trainerSchema.index({ firstName: 'text', lastName: 'text' })

export const TrainerModel = model<ITrainer>('Trainer', trainerSchema, 'trainers')
