import type { RouteObject } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { adminRoutes } from '@/routes/admin.routes'

/** `RouteObject['lazy']` is typed as a discriminated union; every route in this codebase uses the plain-function form (`() => import(...).then(...)`), so this narrows to that shape for the one place this test needs to actually invoke it. */
function asLazyLoader(lazy: RouteObject['lazy']): () => Promise<{ Component: unknown }> {
  if (typeof lazy !== 'function') {
    throw new Error('Expected this route to use the plain-function `lazy` form')
  }
  return lazy as () => Promise<{ Component: unknown }>
}

/**
 * Route-config assertion for Admin Enrolment Operations' role gate — same
 * shape as `admin.routes.batches.test.tsx`. `adminRoutes` is mounted
 * entirely inside `app/router.tsx`'s `<RequireRole allowed={['SUPER_ADMIN',
 * 'ADMIN']}>` wrapper around the whole `/admin` subtree; enrolments have no
 * further per-route role check of their own, matching batches/courses/
 * students/trainers. `admin-area-role-gate.test.tsx` already exercises
 * that outer gate end-to-end (ADMIN allowed in, STUDENT/TRAINER blocked)
 * generically — this only confirms the three enrolment routes are actually
 * registered under that subtree, unguarded by any *additional* nested role
 * check (unlike `settings`/`audit-logs`, which are further restricted to
 * SUPER_ADMIN only).
 */
describe('adminRoutes — enrollments', () => {
  it('registers the enrolments list, create, and detail routes', () => {
    const paths = adminRoutes.map((route) => route.path)

    expect(paths).toContain('enrollments')
    expect(paths).toContain('enrollments/new')
    expect(paths).toContain('enrollments/:enrollmentId')
  })

  it('does not nest the enrolments routes behind an additional SUPER_ADMIN-only element', () => {
    const superAdminOnlyGroup = adminRoutes.find(
      (route) => route.path === undefined && route.children,
    )
    const superAdminOnlyPaths = superAdminOnlyGroup?.children?.map((route) => route.path) ?? []

    expect(superAdminOnlyPaths).not.toContain('enrollments')
    expect(superAdminOnlyPaths).not.toContain('enrollments/new')
    expect(superAdminOnlyPaths).not.toContain('enrollments/:enrollmentId')
  })

  it('lazy-loads each enrolments route from its own dedicated page module', async () => {
    const listRoute = adminRoutes.find((route) => route.path === 'enrollments')
    const createRoute = adminRoutes.find((route) => route.path === 'enrollments/new')
    const detailRoute = adminRoutes.find((route) => route.path === 'enrollments/:enrollmentId')

    expect(listRoute?.lazy).toBeTypeOf('function')
    expect(createRoute?.lazy).toBeTypeOf('function')
    expect(detailRoute?.lazy).toBeTypeOf('function')

    const [listModule, createModule, detailModule] = await Promise.all([
      asLazyLoader(listRoute?.lazy)(),
      asLazyLoader(createRoute?.lazy)(),
      asLazyLoader(detailRoute?.lazy)(),
    ])

    expect(listModule).toHaveProperty('Component')
    expect(createModule).toHaveProperty('Component')
    expect(detailModule).toHaveProperty('Component')
  })
})
