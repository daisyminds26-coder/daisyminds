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
  { path: 'live-classes', lazy: comingSoon },
  { path: 'attendance', lazy: comingSoon },
  { path: 'assignments', lazy: comingSoon },
  { path: 'results', lazy: comingSoon },
  {
    path: 'profile',
    lazy: () =>
      import('@/pages/account/AccountSecurityPage').then((m) => ({ Component: m.default })),
  },
  { path: 'settings', lazy: comingSoon },
]
