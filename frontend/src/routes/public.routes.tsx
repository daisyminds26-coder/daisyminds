import type { RouteObject } from 'react-router-dom'

import { AuthLayout } from '@/shared/components/layout/auth-layout'
import { RequireGuest } from '@/shared/guards/require-guest'

/** Public, unauthenticated routes — mounted outside `RequireAuth` (API-STANDARDS.md §6's public-router pattern, mirrored client-side). */
export const publicRoutes: RouteObject[] = [
  {
    element: <AuthLayout />,
    children: [
      {
        element: <RequireGuest />,
        children: [
          {
            path: 'login',
            lazy: () => import('@/pages/auth/LoginPage').then((m) => ({ Component: m.default })),
          },
          {
            path: 'forgot-password',
            lazy: () =>
              import('@/pages/auth/ForgotPasswordPage').then((m) => ({ Component: m.default })),
          },
          {
            path: 'reset-password',
            lazy: () =>
              import('@/pages/auth/ResetPasswordPage').then((m) => ({ Component: m.default })),
          },
        ],
      },
      {
        // Reachable whether authenticated or not — a logged-in user clicking a
        // stale verification link should still be able to complete it.
        path: 'verify-email',
        lazy: () => import('@/pages/auth/VerifyEmailPage').then((m) => ({ Component: m.default })),
      },
    ],
  },
  {
    path: 'maintenance',
    lazy: () => import('@/pages/errors/MaintenancePage').then((m) => ({ Component: m.default })),
  },
]
