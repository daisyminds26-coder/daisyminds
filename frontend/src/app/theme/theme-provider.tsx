import { useEffect, useMemo, type ReactNode } from 'react'

import { ThemeContext, type ThemeContextValue } from '@/app/theme/theme-context'

/**
 * Dark mode is explicitly out of scope for V1 (UI-DESIGN-SYSTEM.md §10) and
 * is not built speculatively (CLAUDE.md's KISS principle) — so 'light' is
 * the only supported theme today. This provider still exists as a real
 * seam (not a stub): it owns the `<html>` root attribute and the mobile
 * browser-chrome color, which is exactly where a future theme switch would
 * plug in without a rework, since the token values it would toggle already
 * exist in index.css's `.dark` block.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const value = useMemo<ThemeContextValue>(() => ({ theme: 'light' }), [])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = value.theme
    root.classList.remove('dark')

    const meta = document.querySelector('meta[name="theme-color"]')
    meta?.setAttribute('content', '#fffcf5')
  }, [value.theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
