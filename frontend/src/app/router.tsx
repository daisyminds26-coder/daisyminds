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
