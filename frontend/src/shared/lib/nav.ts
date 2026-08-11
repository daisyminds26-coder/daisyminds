import type { NavSection } from '@/shared/types/nav'
import type { Role } from '@/shared/types/role'

/**
 * UI-only visibility filter (SECURITY.md §3 — never a security boundary).
 * Drops items whose `roles` allowlist excludes the current role, then drops
 * any section left with no visible items.
 */
export function filterNavByRole(sections: readonly NavSection[], role: Role): NavSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.roles || item.roles.includes(role)),
    }))
    .filter((section) => section.items.length > 0)
}
