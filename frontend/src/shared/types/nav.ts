import type { ComponentType } from 'react'

import type { Role } from '@/shared/types/role'

export interface NavItem {
  /** Stable key — used for React lists and active-route matching. */
  id: string
  label: string
  href: string
  icon: ComponentType<{ className?: string }>
  /** Roles allowed to see this item. Omit to show to every authenticated role. */
  roles?: readonly Role[]
  badge?: string
}

export interface NavSection {
  id: string
  label?: string
  items: readonly NavItem[]
}
