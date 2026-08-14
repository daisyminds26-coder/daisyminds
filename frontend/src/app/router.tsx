import { Navigate, createBrowserRouter } from 'react-router-dom'

import { RequireAuth } from '@/shared/guards/require-auth'
import { RequireRole } from '@/shared/guards/require-role'
import { adminRoutes } from '@/routes/admin.routes'
import { trainerRoutes } from '@/routes/trainer.routes'
import { studentRoutes } from '@/routes/student.routes'
import { publicRoutes } from '@/routes/public.routes'

export const router = createBrowserRouter([
  { index: true, element: <Navigate to="/login" replace /> },
  ...publicRoutes,
  {
    element: <RequireAuth />,
    children: [
      {
        element: <RequireRole allowed={['SUPER_ADMIN', 'ADMIN']} />,
        children: [
          {
            path: 'admin',
            lazy: () =>
              import('@/routes/layouts/admin-dashboard-layout').then((m) => ({
                Component: m.default,
              })),
            children: adminRoutes,
          },
        ],
      },
      {
        element: <RequireRole allowed={['TRAINER']} />,
        children: [
          {
            path: 'trainer',
            lazy: () =>
              import('@/routes/layouts/trainer-dashboard-layout').then((m) => ({
                Component: m.default,
              })),
            children: trainerRoutes,
          },
        ],
      },
      {
        element: <RequireRole allowed={['STUDENT']} />,
        children: [
          {
            path: 'student',
            lazy: () =>
              import('@/routes/layouts/student-dashboard-layout').then((m) => ({
                Component: m.default,
              })),
            children: studentRoutes,
          },
          // The Learning Player is deliberately NOT nested under the
          // student-dashboard-layout (StudentShell) — it renders its own
          // full-page header/curriculum-sidebar and needs to stay
          // distraction-free (task's own instruction), not wrapped in the
          // portal's sidebar/header/bottom-nav chrome as well.
          {
            path: 'student/courses/:courseId/learn',
            lazy: () =>
              import('@/pages/student/StudentLearningRedirectPage').then((m) => ({
                Component: m.default,
              })),
          },
          {
            path: 'student/courses/:courseId/learn/:lessonId',
            lazy: () =>
              import('@/pages/student/StudentLearningPlayerPage').then((m) => ({
                Component: m.default,
              })),
          },
        ],
      },
    ],
  },
  {
    path: 'unauthorized',
    lazy: () => import('@/pages/errors/UnauthorizedPage').then((m) => ({ Component: m.default })),
  },
  {
    path: 'server-error',
    lazy: () => import('@/pages/errors/ServerErrorPage').then((m) => ({ Component: m.default })),
  },
  {
    path: '*',
    lazy: () => import('@/pages/errors/NotFoundPage').then((m) => ({ Component: m.default })),
  },
])
