import type { Types } from 'mongoose'
import { Schema, model, type HydratedDocument } from 'mongoose'

import { applyAuditPlugin, auditFieldsDefinition } from './plugins/audit-fields.plugin'
import type { AuditFields } from './shared/audit-fields.type'

export const GENDERS = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'] as const
export type Gender = (typeof GENDERS)[number]

export const STUDENT_SOURCES = [
  'WEBSITE',
  'REFERRAL',
  'WALK_IN',
  'SOCIAL_MEDIA',
  'ADVERTISEMENT',
  'OTHER',
] as const
export type StudentSource = (typeof STUDENT_SOURCES)[number]

export const GRADE_TYPES = ['PERCENTAGE', 'CGPA', 'GRADE'] as const
export type GradeType = (typeof GRADE_TYPES)[number]

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

/**
 * Additive extension of the Phase 1 scaffold's `degree`/`institution`/
 * `yearOfCompletion` triplet (DATABASE.md §3.2) — the new fields are all
 * optional so pre-existing records (none in production yet, but the shape
 * itself) remain valid without a migration.
 */
export interface IEducationRecord {
  degree: string
  institution: string
  yearOfCompletion: number
  boardOrUniversity: string | null
  fieldOfStudy: string | null
  gradeValue: string | null
  gradeType: GradeType | null
  documentUrl: string | null
  documentPublicId: string | null
}

export interface IKycDocument {
  type: string
  url: string
  verifiedAt: Date | null
}

/**
 * 1:1 academic/personal profile satellite to `users` (role = STUDENT) — kept
 * separate from `users` so auth-hot-path reads never load this larger
 * payload (DATABASE.md §2.2). Guardian fields are reserved for the pending
 * minors/DPDP decision (SECURITY.md §7) — nullable, not required, until that
 * policy is confirmed.
 *
 * Phase 6 (Admin Student Management) additive fields are grouped below the
 * original Phase 1 scaffold fields, each documented with the section of the
 * phase spec they satisfy — see ARCHITECTURE.md's Student Management
 * section for the full design rationale (studentId generation, profile
 * completion, the aggregation-based list query, etc).
 */
export interface IStudent extends AuditFields {
  userId: Types.ObjectId
  firstName: string
  lastName: string
  dateOfBirth: Date | null
  gender: Gender | null
  phone: string | null
  address: IAddress | null
  guardianName: string | null
  guardianPhone: string | null
  guardianEmail: string | null
  educationRecords: IEducationRecord[]
  profilePhotoUrl: string | null
  kycDocuments: IKycDocument[]

  // --- Phase 6 additions ---

  /** Server-generated, immutable after creation (service-layer enforced — see student-id.service.ts). */
  studentId: string
  middleName: string | null
  /** Defaults to `firstName + lastName` at creation if not supplied — see student-management.service.ts. */
  displayName: string | null
  preferredLanguage: string | null
  alternatePhone: string | null
  /** At least one required at creation (Zod-enforced, not a Mongoose array-length constraint — see student.validator.ts). */
  emergencyContacts: IEmergencyContact[]
  guardianRelationship: string | null
  guardianOccupation: string | null
  guardianAddressSameAsStudent: boolean
  guardianAddress: IAddress | null
  profilePhotoPublicId: string | null
  admissionDate: Date | null
  source: StudentSource | null
  /** Distinct from the audit plugin's `createdBy` — the counsellor who owns the relationship may not be whoever operated the admin UI to create the record. */
  counsellorId: Types.ObjectId | null
  notes: string | null
  tags: string[]
  /** Recalculated server-side after every profile write — never accepted as client input (student-management.service.ts#calculateProfileCompletion). */
  profileCompletionPercentage: number
  profileCompletionStatus: ProfileCompletionStatus
}

export type StudentDocument = HydratedDocument<IStudent>

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

const educationRecordSchema = new Schema<IEducationRecord>(
  {
    degree: { type: String, required: true, trim: true, maxlength: 150 },
    institution: { type: String, required: true, trim: true, maxlength: 200 },
    yearOfCompletion: { type: Number, required: true, min: 1950, max: 2100 },
    boardOrUniversity: { type: String, default: null, trim: true, maxlength: 200 },
    fieldOfStudy: { type: String, default: null, trim: true, maxlength: 150 },
    gradeValue: { type: String, default: null, trim: true, maxlength: 20 },
    gradeType: { type: String, enum: GRADE_TYPES, default: null },
    documentUrl: { type: String, default: null },
    documentPublicId: { type: String, default: null },
  },
  { _id: false },
)

const kycDocumentSchema = new Schema<IKycDocument>(
  {
    type: { type: String, required: true, trim: true, maxlength: 60 },
    url: { type: String, required: true, trim: true },
    verifiedAt: { type: Date, default: null },
  },
  { _id: false },
)

const studentSchema = new Schema<IStudent>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  firstName: { type: String, required: true, trim: true, maxlength: 100 },
  lastName: { type: String, required: true, trim: true, maxlength: 100 },
  dateOfBirth: { type: Date, default: null },
  gender: { type: String, enum: GENDERS, default: null },
  phone: { type: String, default: null, trim: true, maxlength: 20 },
  address: { type: addressSchema, default: null },
  guardianName: { type: String, default: null, trim: true, maxlength: 200 },
  guardianPhone: { type: String, default: null, trim: true, maxlength: 20 },
  guardianEmail: { type: String, default: null, trim: true, lowercase: true, maxlength: 254 },
  educationRecords: { type: [educationRecordSchema], default: [] },
  profilePhotoUrl: { type: String, default: null },
  kycDocuments: { type: [kycDocumentSchema], default: [] },

  studentId: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  middleName: { type: String, default: null, trim: true, maxlength: 100 },
  displayName: { type: String, default: null, trim: true, maxlength: 250 },
  preferredLanguage: { type: String, default: null, trim: true, maxlength: 60 },
  alternatePhone: { type: String, default: null, trim: true, maxlength: 20 },
  emergencyContacts: { type: [emergencyContactSchema], default: [] },
  guardianRelationship: { type: String, default: null, trim: true, maxlength: 60 },
  guardianOccupation: { type: String, default: null, trim: true, maxlength: 150 },
  guardianAddressSameAsStudent: { type: Boolean, default: false },
  guardianAddress: { type: addressSchema, default: null },
  profilePhotoPublicId: { type: String, default: null },
  admissionDate: { type: Date, default: null },
  source: { type: String, enum: STUDENT_SOURCES, default: null },
  counsellorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  notes: { type: String, default: null, trim: true, maxlength: 2000 },
  tags: { type: [String], default: [] },
  profileCompletionPercentage: { type: Number, default: 0, min: 0, max: 100 },
  profileCompletionStatus: {
    type: String,
    enum: PROFILE_COMPLETION_STATUSES,
    default: 'INCOMPLETE',
  },

  ...auditFieldsDefinition,
})

applyAuditPlugin(studentSchema)

studentSchema.index({ userId: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } })
studentSchema.index(
  { studentId: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
)
studentSchema.index({ phone: 1 }, { sparse: true })
studentSchema.index({ firstName: 'text', lastName: 'text' })
studentSchema.index({ admissionDate: 1 })
studentSchema.index({ tags: 1 })
studentSchema.index({ 'address.state': 1, 'address.city': 1 })

export const StudentModel = model<IStudent>('Student', studentSchema, 'students')
