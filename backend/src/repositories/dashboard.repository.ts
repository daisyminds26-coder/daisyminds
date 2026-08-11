import { StudentModel } from '../models/student.model'
import { TrainerModel } from '../models/trainer.model'
import { UserModel } from '../models/user.model'
import { AuditLogModel } from '../models/audit-log.model'
import { CourseModel } from '../models/course.model'
import type { UserStatus } from '../models/user.model'
import type { ProfileCompletionStatus } from '../models/student.model'

export interface DateWindow {
  startDate: Date
  endDate: Date
}

export interface CountByKey {
  key: string
  count: number
}

export interface PersonMetrics {
  activeCount: number
  newCount: number
  profileCompletionDistribution: CountByKey[]
}

export interface UserMetrics {
  activeCount: number
  pendingVerificationCount: number
  lockedCount: number
  suspendedCount: number
  statusDistribution: CountByKey[]
}

export interface RecentPersonRow {
  id: string
  displayId: string
  firstName: string
  lastName: string
  email: string
  status: UserStatus
  profileCompletionStatus: ProfileCompletionStatus
  createdAt: Date
}

export interface RawAuditRow {
  id: string
  actorId: string | null
  action: string
  entityType: string
  entityId: string
  createdAt: Date
}

/** $lookup+$facet is the same pattern `student.repository.ts`/`trainer.repository.ts#list` use — one round trip covers active-count, new-in-period count, and the profile-completion distribution together. */
async function personMetrics(
  model: typeof StudentModel | typeof TrainerModel,
  window: DateWindow,
): Promise<PersonMetrics> {
  const [result] = await model.aggregate<{
    activeCount: { count: number }[]
    newCount: { count: number }[]
    profileCompletionDistribution: { _id: ProfileCompletionStatus; count: number }[]
  }>([
    { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
    { $match: { 'user.isDeleted': false } },
    {
      $facet: {
        activeCount: [{ $match: { 'user.status': 'ACTIVE' } }, { $count: 'count' }],
        newCount: [
          { $match: { createdAt: { $gte: window.startDate, $lte: window.endDate } } },
          { $count: 'count' },
        ],
        profileCompletionDistribution: [
          { $group: { _id: '$profileCompletionStatus', count: { $sum: 1 } } },
        ],
      },
    },
  ])

  return {
    activeCount: result?.activeCount[0]?.count ?? 0,
    newCount: result?.newCount[0]?.count ?? 0,
    profileCompletionDistribution: (result?.profileCompletionDistribution ?? []).map((row) => ({
      key: row._id,
      count: row.count,
    })),
  }
}

export async function getStudentMetrics(window: DateWindow): Promise<PersonMetrics> {
  return personMetrics(StudentModel, window)
}

export async function getTrainerMetrics(window: DateWindow): Promise<PersonMetrics> {
  return personMetrics(TrainerModel, window)
}

export async function getUserMetrics(): Promise<UserMetrics> {
  const [result] = await UserModel.aggregate<{
    activeCount: { count: number }[]
    pendingVerificationCount: { count: number }[]
    lockedCount: { count: number }[]
    suspendedCount: { count: number }[]
    statusDistribution: { _id: UserStatus; count: number }[]
  }>([
    { $match: { isDeleted: false } },
    {
      $facet: {
        activeCount: [{ $match: { status: 'ACTIVE' } }, { $count: 'count' }],
        pendingVerificationCount: [
          { $match: { status: 'PENDING_VERIFICATION' } },
          { $count: 'count' },
        ],
        lockedCount: [{ $match: { status: 'LOCKED' } }, { $count: 'count' }],
        suspendedCount: [{ $match: { status: 'SUSPENDED' } }, { $count: 'count' }],
        statusDistribution: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
      },
    },
  ])

  return {
    activeCount: result?.activeCount[0]?.count ?? 0,
    pendingVerificationCount: result?.pendingVerificationCount[0]?.count ?? 0,
    lockedCount: result?.lockedCount[0]?.count ?? 0,
    suspendedCount: result?.suspendedCount[0]?.count ?? 0,
    statusDistribution: (result?.statusDistribution ?? []).map((row) => ({
      key: row._id,
      count: row.count,
    })),
  }
}

/** Field projection + a small `limit` — never hydrates a full profile document just to show a name and a date (per the phase's performance requirements). */
async function recentPeople(
  model: typeof StudentModel | typeof TrainerModel,
  idField: 'studentId' | 'trainerId',
  limit: number,
): Promise<RecentPersonRow[]> {
  const rows = await model.aggregate<{
    _id: unknown
    displayId: string
    firstName: string
    lastName: string
    profileCompletionStatus: ProfileCompletionStatus
    createdAt: Date
    email: string
    status: UserStatus
  }>([
    { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
    { $match: { 'user.isDeleted': false } },
    { $sort: { createdAt: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 1,
        displayId: `$${idField}`,
        firstName: 1,
        lastName: 1,
        profileCompletionStatus: 1,
        createdAt: 1,
        email: '$user.email',
        status: '$user.status',
      },
    },
  ])

  return rows.map((row) => ({
    id: String(row._id),
    displayId: row.displayId,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    status: row.status,
    profileCompletionStatus: row.profileCompletionStatus,
    createdAt: row.createdAt,
  }))
}

export async function getRecentStudents(limit: number): Promise<RecentPersonRow[]> {
  return recentPeople(StudentModel, 'studentId', limit)
}

export async function getRecentTrainers(limit: number): Promise<RecentPersonRow[]> {
  return recentPeople(TrainerModel, 'trainerId', limit)
}

/**
 * The activity feed's own action allowlist — deliberately excludes
 * session/auth/photo/export/bulk/invitation events. Those are either
 * high-volume noise for a high-level operational feed or belong to the
 * separate "session and account-security indicators" surface (SECURITY.md
 * §8) rather than "what changed in the org today." Kept as an explicit,
 * reviewable constant rather than an exclusion list, so adding a new module
 * later can't silently leak its events into this feed.
 */
export const DASHBOARD_ACTIVITY_ACTIONS = [
  'user.created',
  'user.updated',
  'user.activated',
  'user.deactivated',
  'user.soft_deleted',
  'user.restored',
  'user.role_assigned',
  'student.created',
  'student.updated',
  'student.activated',
  'student.deactivated',
  'student.soft_deleted',
  'student.restored',
  'trainer.created',
  'trainer.updated',
  'trainer.activated',
  'trainer.deactivated',
  'trainer.soft_deleted',
  'trainer.restored',
] as const

export async function getRecentActivity(limit: number): Promise<RawAuditRow[]> {
  const rows = await AuditLogModel.find({ action: { $in: DASHBOARD_ACTIVITY_ACTIONS } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select({ actorId: 1, action: 1, entityType: 1, entityId: 1, createdAt: 1 })
    .lean()

  return rows.map((row) => ({
    id: String(row._id),
    actorId: row.actorId ? String(row.actorId) : null,
    action: row.action,
    entityType: row.entityType,
    entityId: String(row.entityId),
    createdAt: row.createdAt,
  }))
}

export interface DisplayNameLookups {
  users: Map<string, string>
  students: Map<string, string>
  trainers: Map<string, string>
}

/** Batched lookup for the activity feed's actor/entity display names — never one query per row (N+1). */
export async function resolveDisplayNames(input: {
  userIds: string[]
  studentIds: string[]
  trainerIds: string[]
}): Promise<DisplayNameLookups> {
  const [users, students, trainers] = await Promise.all([
    input.userIds.length > 0
      ? UserModel.find({ _id: { $in: input.userIds } })
          .select({ email: 1 })
          .lean()
      : [],
    input.studentIds.length > 0
      ? StudentModel.find({ _id: { $in: input.studentIds } })
          .select({ firstName: 1, lastName: 1, studentId: 1 })
          .lean()
      : [],
    input.trainerIds.length > 0
      ? TrainerModel.find({ _id: { $in: input.trainerIds } })
          .select({ firstName: 1, lastName: 1, trainerId: 1 })
          .lean()
      : [],
  ])

  return {
    users: new Map(users.map((user) => [String(user._id), user.email])),
    students: new Map(
      students.map((student) => [
        String(student._id),
        `${student.firstName} ${student.lastName} (${student.studentId})`,
      ]),
    ),
    trainers: new Map(
      trainers.map((trainer) => [
        String(trainer._id),
        `${trainer.firstName} ${trainer.lastName} (${trainer.trainerId})`,
      ]),
    ),
  }
}

export async function getPublishedCourseCount(): Promise<number> {
  return CourseModel.countDocuments({ status: 'PUBLISHED', isDeleted: false })
}

export async function hasAnyStudents(): Promise<boolean> {
  return (await StudentModel.exists({})) !== null
}

export async function hasAnyTrainers(): Promise<boolean> {
  return (await TrainerModel.exists({})) !== null
}
