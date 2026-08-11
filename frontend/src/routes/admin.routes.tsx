import type { RouteObject } from 'react-router-dom'

import { RequireRole } from '@/shared/guards/require-role'

const comingSoon = () =>
  import('@/pages/errors/ComingSoonPage').then((m) => ({ Component: m.default }))

/**
 * Every nav destination gets a route today, even those without a built
 * module yet — they resolve to `ComingSoonPage` (fees, certificates,
 * placements, reports etc. remain explicitly out of scope; Admin
 * Student/Trainer/Course/Batch/Enrolment Management are implemented as of
 * Phases 6/7/9A/10A/10B, see ARCHITECTURE.md). `settings`/`audit-logs` are
 * additionally gated to SUPER_ADMIN, matching their `roles` restriction in
 * `shared/config/navigation.ts`.
 */
export const adminRoutes: RouteObject[] = [
  {
    index: true,
    lazy: () => import('@/pages/admin/AdminDashboardPage').then((m) => ({ Component: m.default })),
  },
  {
    path: 'users',
    lazy: () => import('@/pages/admin/UsersPage').then((m) => ({ Component: m.default })),
  },
  {
    path: 'students',
    lazy: () => import('@/pages/admin/StudentsPage').then((m) => ({ Component: m.default })),
  },
  {
    path: 'students/new',
    lazy: () => import('@/pages/admin/StudentCreatePage').then((m) => ({ Component: m.default })),
  },
  {
    path: 'trainers',
    lazy: () => import('@/pages/admin/TrainersPage').then((m) => ({ Component: m.default })),
  },
  {
    path: 'trainers/new',
    lazy: () => import('@/pages/admin/TrainerCreatePage').then((m) => ({ Component: m.default })),
  },
  {
    path: 'courses',
    lazy: () => import('@/pages/admin/CoursesPage').then((m) => ({ Component: m.default })),
  },
  {
    path: 'courses/new',
    lazy: () => import('@/pages/admin/CourseCreatePage').then((m) => ({ Component: m.default })),
  },
  {
    path: 'courses/:courseId/curriculum',
    lazy: () =>
      import('@/pages/admin/CourseCurriculumPage').then((m) => ({ Component: m.default })),
  },
  {
    path: 'courses/:courseId/curriculum/modules/:moduleId/lessons/:lessonId/content',
    lazy: () =>
      import('@/pages/admin/LessonContentEditorPage').then((m) => ({ Component: m.default })),
  },
  {
    path: 'batches',
    lazy: () => import('@/pages/admin/BatchesPage').then((m) => ({ Component: m.default })),
  },
  {
    path: 'batches/new',
    lazy: () => import('@/pages/admin/BatchCreatePage').then((m) => ({ Component: m.default })),
  },
  {
    path: 'batches/:batchId',
    lazy: () => import('@/pages/admin/BatchDetailPage').then((m) => ({ Component: m.default })),
  },
  {
    path: 'enrollments',
    lazy: () => import('@/pages/admin/EnrollmentsPage').then((m) => ({ Component: m.default })),
  },
  {
    path: 'enrollments/new',
    lazy: () =>
      import('@/pages/admin/EnrollmentCreatePage').then((m) => ({ Component: m.default })),
  },
  {
    path: 'enrollments/:enrollmentId',
    lazy: () =>
      import('@/pages/admin/EnrollmentDetailPage').then((m) => ({ Component: m.default })),
  },
  { path: 'attendance', lazy: comingSoon },
  { path: 'fees', lazy: comingSoon },
  { path: 'certificates', lazy: comingSoon },
  { path: 'placements', lazy: comingSoon },
  { path: 'reports', lazy: comingSoon },
  {
    path: 'profile',
    lazy: () =>
      import('@/pages/account/AccountSecurityPage').then((m) => ({ Component: m.default })),
  },
  {
    element: <RequireRole allowed={['SUPER_ADMIN']} />,
    children: [
      { path: 'settings', lazy: comingSoon },
      { path: 'audit-logs', lazy: comingSoon },
    ],
  },
]
