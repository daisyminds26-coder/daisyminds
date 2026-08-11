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
 * Route-config assertion for Batch Management's role gate: `adminRoutes` is
 * mounted entirely inside `app/router.tsx`'s
 * `<RequireRole allowed={['SUPER_ADMIN','ADMIN']}>` wrapper around the whole
 * `/admin` subtree (see `src/app/router.tsx`) — the same shape as
 * courses/students/trainers, which have no further per-route role check of
 * their own either. `src/shared/guards/__tests__/admin-area-role-gate.test.tsx`
 * already exercises that outer gate end-to-end (ADMIN allowed in, STUDENT
 * blocked) for the `/admin` subtree generically; this test only confirms
 * the three batches routes are actually registered under that subtree,
 * unguarded by any *additional* nested role check (unlike `settings`/
 * `audit-logs`, which are further restricted to SUPER_ADMIN only).
 */
describe('adminRoutes — batches', () => {
  it('registers the batches list, create, and detail routes', () => {
    const paths = adminRoutes.map((route) => route.path)

    expect(paths).toContain('batches')
    expect(paths).toContain('batches/new')
    expect(paths).toContain('batches/:batchId')
  })

  it('does not nest the batches routes behind an additional SUPER_ADMIN-only element (unlike settings/audit-logs)', () => {
    const superAdminOnlyGroup = adminRoutes.find(
      (route) => route.path === undefined && route.children,
    )
    const superAdminOnlyPaths = superAdminOnlyGroup?.children?.map((route) => route.path) ?? []

    expect(superAdminOnlyPaths).not.toContain('batches')
    expect(superAdminOnlyPaths).not.toContain('batches/new')
    expect(superAdminOnlyPaths).not.toContain('batches/:batchId')
  })

  it('lazy-loads each batches route from its own dedicated page module', async () => {
    const batchesRoute = adminRoutes.find((route) => route.path === 'batches')
    const batchesNewRoute = adminRoutes.find((route) => route.path === 'batches/new')
    const batchesDetailRoute = adminRoutes.find((route) => route.path === 'batches/:batchId')

    expect(batchesRoute?.lazy).toBeTypeOf('function')
    expect(batchesNewRoute?.lazy).toBeTypeOf('function')
    expect(batchesDetailRoute?.lazy).toBeTypeOf('function')

    const [listModule, createModule, detailModule] = await Promise.all([
      asLazyLoader(batchesRoute?.lazy)(),
      asLazyLoader(batchesNewRoute?.lazy)(),
      asLazyLoader(batchesDetailRoute?.lazy)(),
    ])

    expect(listModule).toHaveProperty('Component')
    expect(createModule).toHaveProperty('Component')
    expect(detailModule).toHaveProperty('Component')
  })
})
