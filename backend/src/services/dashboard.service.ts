import { getCachedDashboard, setCachedDashboard } from './dashboard-cache.service'
import {
  DASHBOARD_ACTIVITY_ACTIONS,
  getPublishedCourseCount,
  getRecentActivity,
  getRecentStudents,
  getRecentTrainers,
  getStudentMetrics,
  getTrainerMetrics,
  getUserMetrics,
  hasAnyStudents,
  hasAnyTrainers,
  resolveDisplayNames,
  type CountByKey,
} from '../repositories/dashboard.repository'
import { resolveDashboardPeriod, type DashboardRange } from '../utils/date-range'

const RECENT_LIST_LIMIT = 5
const RECENT_ACTIVITY_LIMIT = 15
const CACHE_TTL_SECONDS = 60

export interface DashboardSummary {
  activeStudents: number
  activeTrainers: number
  activeUsers: number
  newStudents: number
  newTrainers: number
  pendingVerificationAccounts: number
  lockedAccounts: number
  suspendedAccounts: number
  incompleteStudentProfiles: number
  incompleteTrainerProfiles: number
  publishedCourses: number
}

export interface DashboardDistributions {
  userStatus: CountByKey[]
  studentProfileCompletion: CountByKey[]
  trainerProfileCompletion: CountByKey[]
}

export interface RecentPersonDto {
  id: string
  displayId: string
  name: string
  email: string
  status: string
  profileCompletionStatus: string
  createdAt: string
}

export interface RecentActivityDto {
  id: string
  action: string
  entityType: string
  entityLabel: string
  actorLabel: string
  createdAt: string
}

export type DashboardAlertType =
  | 'PENDING_VERIFICATION'
  | 'LOCKED_ACCOUNTS'
  | 'SUSPENDED_ACCOUNTS'
  | 'INCOMPLETE_STUDENT_PROFILES'
  | 'INCOMPLETE_TRAINER_PROFILES'
  | 'NO_STUDENTS'
  | 'NO_TRAINERS'

export interface DashboardAlert {
  type: DashboardAlertType
  severity: 'info' | 'warning' | 'critical'
  title: string
  description: string
  count: number
  actionLabel: string
  actionRoute: string
}

export interface DashboardPeriodDto {
  range: DashboardRange
  startDate: string
  endDate: string
  timezone: string
}

export interface AdminDashboardResponse {
  summary: DashboardSummary
  distributions: DashboardDistributions
  recentStudents: RecentPersonDto[]
  recentTrainers: RecentPersonDto[]
  recentActivity: RecentActivityDto[] | null
  alerts: DashboardAlert[]
  period: DashboardPeriodDto
  generatedAt: string
}

export interface GetAdminDashboardInput {
  range: DashboardRange
  startDate?: Date
  endDate?: Date
  timezone: string
  includeActivity: boolean
}

/**
 * Allowlisted internal routes for alert "action" links — never built from
 * request input, so an alert can never carry an open-redirect or an
 * arbitrary route (SECURITY.md §4).
 */
const ALERT_ROUTES: Record<DashboardAlertType, string> = {
  PENDING_VERIFICATION: '/admin/users?status=PENDING_VERIFICATION',
  LOCKED_ACCOUNTS: '/admin/users?status=LOCKED',
  SUSPENDED_ACCOUNTS: '/admin/users?status=SUSPENDED',
  INCOMPLETE_STUDENT_PROFILES: '/admin/students?profileCompletionStatus=INCOMPLETE',
  INCOMPLETE_TRAINER_PROFILES: '/admin/trainers?profileCompletionStatus=INCOMPLETE',
  NO_STUDENTS: '/admin/students',
  NO_TRAINERS: '/admin/trainers',
}

function distributionCount(distribution: CountByKey[], key: string): number {
  return distribution.find((row) => row.key === key)?.count ?? 0
}

function buildAlerts(input: {
  pendingVerificationCount: number
  lockedCount: number
  suspendedCount: number
  incompleteStudentProfiles: number
  incompleteTrainerProfiles: number
  studentsExist: boolean
  trainersExist: boolean
}): DashboardAlert[] {
  const alerts: DashboardAlert[] = []

  if (!input.studentsExist) {
    alerts.push({
      type: 'NO_STUDENTS',
      severity: 'info',
      title: 'No student records yet',
      description: 'Add your first student to start tracking admissions and profiles.',
      count: 0,
      actionLabel: 'Add student',
      actionRoute: ALERT_ROUTES.NO_STUDENTS,
    })
  }
  if (!input.trainersExist) {
    alerts.push({
      type: 'NO_TRAINERS',
      severity: 'info',
      title: 'No trainer records yet',
      description: 'Add your first trainer to start tracking onboarding and availability.',
      count: 0,
      actionLabel: 'Add trainer',
      actionRoute: ALERT_ROUTES.NO_TRAINERS,
    })
  }
  if (input.pendingVerificationCount > 0) {
    alerts.push({
      type: 'PENDING_VERIFICATION',
      severity: 'info',
      title: `${String(input.pendingVerificationCount)} account(s) awaiting verification`,
      description: 'These accounts cannot log in until email verification completes.',
      count: input.pendingVerificationCount,
      actionLabel: 'Review accounts',
      actionRoute: ALERT_ROUTES.PENDING_VERIFICATION,
    })
  }
  if (input.lockedCount > 0) {
    alerts.push({
      type: 'LOCKED_ACCOUNTS',
      severity: 'warning',
      title: `${String(input.lockedCount)} account(s) currently locked`,
      description:
        'Locked from repeated failed login attempts — will auto-unlock or can be reviewed now.',
      count: input.lockedCount,
      actionLabel: 'Review accounts',
      actionRoute: ALERT_ROUTES.LOCKED_ACCOUNTS,
    })
  }
  if (input.suspendedCount > 0) {
    alerts.push({
      type: 'SUSPENDED_ACCOUNTS',
      severity: 'warning',
      title: `${String(input.suspendedCount)} account(s) suspended`,
      description: 'Suspended accounts cannot log in until reactivated.',
      count: input.suspendedCount,
      actionLabel: 'Review accounts',
      actionRoute: ALERT_ROUTES.SUSPENDED_ACCOUNTS,
    })
  }
  if (input.incompleteStudentProfiles > 0) {
    alerts.push({
      type: 'INCOMPLETE_STUDENT_PROFILES',
      severity: 'info',
      title: `${String(input.incompleteStudentProfiles)} incomplete student profile(s)`,
      description: 'Missing key details — complete these profiles to improve reporting accuracy.',
      count: input.incompleteStudentProfiles,
      actionLabel: 'Review students',
      actionRoute: ALERT_ROUTES.INCOMPLETE_STUDENT_PROFILES,
    })
  }
  if (input.incompleteTrainerProfiles > 0) {
    alerts.push({
      type: 'INCOMPLETE_TRAINER_PROFILES',
      severity: 'info',
      title: `${String(input.incompleteTrainerProfiles)} incomplete trainer profile(s)`,
      description: 'Missing key details — complete these profiles to improve reporting accuracy.',
      count: input.incompleteTrainerProfiles,
      actionLabel: 'Review trainers',
      actionRoute: ALERT_ROUTES.INCOMPLETE_TRAINER_PROFILES,
    })
  }

  return alerts
}

async function buildRecentActivity(): Promise<RecentActivityDto[]> {
  const rows = await getRecentActivity(RECENT_ACTIVITY_LIMIT)

  const userIds = [
    ...new Set(rows.map((row) => row.actorId).filter((id): id is string => id !== null)),
  ]
  const studentIds = [
    ...new Set(rows.filter((row) => row.entityType === 'student').map((row) => row.entityId)),
  ]
  const trainerIds = [
    ...new Set(rows.filter((row) => row.entityType === 'trainer').map((row) => row.entityId)),
  ]
  const entityUserIds = [
    ...new Set(rows.filter((row) => row.entityType === 'user').map((row) => row.entityId)),
  ]

  const names = await resolveDisplayNames({
    userIds: [...new Set([...userIds, ...entityUserIds])],
    studentIds,
    trainerIds,
  })

  function entityLabel(entityType: string, entityId: string): string {
    if (entityType === 'student') return names.students.get(entityId) ?? 'Unknown student'
    if (entityType === 'trainer') return names.trainers.get(entityId) ?? 'Unknown trainer'
    if (entityType === 'user') return names.users.get(entityId) ?? 'Unknown user'
    return entityId
  }

  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    entityType: row.entityType,
    entityLabel: entityLabel(row.entityType, row.entityId),
    actorLabel: row.actorId ? (names.users.get(row.actorId) ?? 'Unknown actor') : 'System',
    createdAt: row.createdAt.toISOString(),
  }))
}

function toRecentPersonDto(row: {
  id: string
  displayId: string
  firstName: string
  lastName: string
  email: string
  status: string
  profileCompletionStatus: string
  createdAt: Date
}): RecentPersonDto {
  return {
    id: row.id,
    displayId: row.displayId,
    name: `${row.firstName} ${row.lastName}`,
    email: row.email,
    status: row.status,
    profileCompletionStatus: row.profileCompletionStatus,
    createdAt: row.createdAt.toISOString(),
  }
}

function cacheKey(
  input: GetAdminDashboardInput,
  period: { startDate: Date; endDate: Date },
): string {
  return [
    input.includeActivity ? 'super_admin' : 'admin',
    input.range,
    period.startDate.toISOString(),
    period.endDate.toISOString(),
    input.timezone,
  ].join(':')
}

export const dashboardService = {
  async getAdminDashboard(input: GetAdminDashboardInput): Promise<AdminDashboardResponse> {
    const period = resolveDashboardPeriod({
      range: input.range,
      startDate: input.startDate,
      endDate: input.endDate,
      timezone: input.timezone,
    })

    const key = cacheKey(input, period)
    const cached = await getCachedDashboard<AdminDashboardResponse>(key)
    if (cached) return cached

    const [
      studentMetrics,
      trainerMetrics,
      userMetrics,
      recentStudents,
      recentTrainers,
      recentActivity,
      studentsExist,
      trainersExist,
      publishedCourses,
    ] = await Promise.all([
      getStudentMetrics(period),
      getTrainerMetrics(period),
      getUserMetrics(),
      getRecentStudents(RECENT_LIST_LIMIT),
      getRecentTrainers(RECENT_LIST_LIMIT),
      input.includeActivity ? buildRecentActivity() : Promise.resolve(null),
      hasAnyStudents(),
      hasAnyTrainers(),
      getPublishedCourseCount(),
    ])

    const incompleteStudentProfiles = distributionCount(
      studentMetrics.profileCompletionDistribution,
      'INCOMPLETE',
    )
    const incompleteTrainerProfiles = distributionCount(
      trainerMetrics.profileCompletionDistribution,
      'INCOMPLETE',
    )

    const response: AdminDashboardResponse = {
      summary: {
        activeStudents: studentMetrics.activeCount,
        activeTrainers: trainerMetrics.activeCount,
        activeUsers: userMetrics.activeCount,
        newStudents: studentMetrics.newCount,
        newTrainers: trainerMetrics.newCount,
        pendingVerificationAccounts: userMetrics.pendingVerificationCount,
        lockedAccounts: userMetrics.lockedCount,
        suspendedAccounts: userMetrics.suspendedCount,
        incompleteStudentProfiles,
        incompleteTrainerProfiles,
        publishedCourses,
      },
      distributions: {
        userStatus: userMetrics.statusDistribution,
        studentProfileCompletion: studentMetrics.profileCompletionDistribution,
        trainerProfileCompletion: trainerMetrics.profileCompletionDistribution,
      },
      recentStudents: recentStudents.map(toRecentPersonDto),
      recentTrainers: recentTrainers.map(toRecentPersonDto),
      recentActivity,
      alerts: buildAlerts({
        pendingVerificationCount: userMetrics.pendingVerificationCount,
        lockedCount: userMetrics.lockedCount,
        suspendedCount: userMetrics.suspendedCount,
        incompleteStudentProfiles,
        incompleteTrainerProfiles,
        studentsExist,
        trainersExist,
      }),
      period: {
        range: period.range,
        startDate: period.startDate.toISOString(),
        endDate: period.endDate.toISOString(),
        timezone: period.timezone,
      },
      generatedAt: new Date().toISOString(),
    }

    await setCachedDashboard(key, response, CACHE_TTL_SECONDS)
    return response
  },
}

/** Re-exported so the controller/validator layer doesn't need to know the repository's internal action allowlist lives here — used only by tests asserting the feed never leaks an unlisted action. */
export { DASHBOARD_ACTIVITY_ACTIONS }
