import type { RouteObject } from 'react-router-dom'

const comingSoon = () =>
  import('@/pages/errors/ComingSoonPage').then((m) => ({ Component: m.default }))

export const studentRoutes: RouteObject[] = [
  {
    index: true,
    lazy: () =>
      import('@/pages/student/StudentDashboardPage').then((m) => ({ Component: m.default })),
  },
  {
    path: 'courses',
    lazy: () => import('@/pages/student/MyCoursesPage').then((m) => ({ Component: m.default })),
  },
  {
    path: 'courses/:courseId',
    lazy: () =>
      import('@/pages/student/StudentCourseOverviewPage').then((m) => ({
        Component: m.default,
      })),
  },
  {
    path: 'live-classes',
    lazy: () =>
      import('@/pages/student/StudentLiveClassesPage').then((m) => ({ Component: m.default })),
  },
  {
    path: 'schedule',
    lazy: () =>
      import('@/pages/student/StudentSchedulePage').then((m) => ({ Component: m.default })),
  },
  {
    path: 'attendance',
    lazy: () =>
      import('@/pages/student/StudentAttendancePage').then((m) => ({ Component: m.default })),
  },
  {
    path: 'resources',
    lazy: () =>
      import('@/pages/student/StudentResourcesPage').then((m) => ({ Component: m.default })),
  },
  {
    path: 'assignments',
    lazy: () =>
      import('@/pages/student/StudentAssignmentsPage').then((m) => ({ Component: m.default })),
  },
  {
    path: 'assignments/:assignmentId',
    lazy: () =>
      import('@/pages/student/StudentAssignmentDetailPage').then((m) => ({ Component: m.default })),
  },
  {
    path: 'assessments',
    lazy: () =>
      import('@/pages/student/StudentAssessmentsPage').then((m) => ({ Component: m.default })),
  },
  {
    path: 'assessments/:assessmentId',
    lazy: () =>
      import('@/pages/student/StudentAssessmentDetailPage').then((m) => ({ Component: m.default })),
  },
  {
    path: 'assessments/:assessmentId/attempt/:attemptId',
    lazy: () =>
      import('@/pages/student/StudentAssessmentAttemptPage').then((m) => ({
        Component: m.default,
      })),
  },
  { path: 'notifications', lazy: comingSoon },
  { path: 'certificates', lazy: comingSoon },
  {
    path: 'profile',
    lazy: () =>
      import('@/pages/student/StudentProfilePage').then((m) => ({ Component: m.default })),
  },
  {
    path: 'settings',
    lazy: () =>
      import('@/pages/account/AccountSecurityPage').then((m) => ({ Component: m.default })),
  },
]
