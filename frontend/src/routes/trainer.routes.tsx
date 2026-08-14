import type { RouteObject } from 'react-router-dom'

const comingSoon = () =>
  import('@/pages/errors/ComingSoonPage').then((m) => ({ Component: m.default }))

export const trainerRoutes: RouteObject[] = [
  {
    index: true,
    lazy: () =>
      import('@/pages/trainer/TrainerDashboardPage').then((m) => ({ Component: m.default })),
  },
  { path: 'courses', lazy: comingSoon },
  {
    path: 'live-classes',
    lazy: () =>
      import('@/pages/trainer/TrainerLiveClassesPage').then((m) => ({ Component: m.default })),
  },
  {
    path: 'attendance',
    lazy: () =>
      import('@/pages/trainer/TrainerAttendancePage').then((m) => ({ Component: m.default })),
  },
  {
    path: 'assignments',
    lazy: () =>
      import('@/pages/trainer/TrainerAssignmentsPage').then((m) => ({ Component: m.default })),
  },
  {
    path: 'assignments/:assignmentId',
    lazy: () =>
      import('@/pages/trainer/TrainerAssignmentDetailPage').then((m) => ({ Component: m.default })),
  },
  {
    path: 'assessments',
    lazy: () =>
      import('@/pages/trainer/TrainerAssessmentsPage').then((m) => ({ Component: m.default })),
  },
  {
    path: 'assessments/:assessmentId',
    lazy: () =>
      import('@/pages/trainer/TrainerAssessmentDetailPage').then((m) => ({ Component: m.default })),
  },
  { path: 'results', lazy: comingSoon },
  {
    path: 'profile',
    lazy: () =>
      import('@/pages/account/AccountSecurityPage').then((m) => ({ Component: m.default })),
  },
  { path: 'settings', lazy: comingSoon },
]
