export const DASHBOARD_RANGES = [
  'TODAY',
  'LAST_7_DAYS',
  'LAST_30_DAYS',
  'THIS_MONTH',
  'THIS_YEAR',
  'CUSTOM',
] as const
export type DashboardRange = (typeof DASHBOARD_RANGES)[number]

export interface CountByKey {
  key: string
  count: number
}

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

export interface RecentPerson {
  id: string
  displayId: string
  name: string
  email: string
  status: string
  profileCompletionStatus: string
  createdAt: string
}

export interface RecentActivityEntry {
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

export interface DashboardPeriod {
  range: DashboardRange
  startDate: string
  endDate: string
  timezone: string
}

export interface AdminDashboard {
  summary: DashboardSummary
  distributions: DashboardDistributions
  recentStudents: RecentPerson[]
  recentTrainers: RecentPerson[]
  recentActivity: RecentActivityEntry[] | null
  alerts: DashboardAlert[]
  period: DashboardPeriod
  generatedAt: string
}

export interface AdminDashboardParams {
  range?: DashboardRange
  startDate?: string
  endDate?: string
  timezone?: string
}
