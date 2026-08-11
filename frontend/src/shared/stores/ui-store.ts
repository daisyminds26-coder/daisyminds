import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UiState {
  /** Desktop/tablet sidebar collapsed (icon-only) state. Persisted across sessions. */
  isSidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  /** Mobile drawer navigation open state. Session-only — never persisted. */
  isMobileNavOpen: boolean
  openMobileNav: () => void
  closeMobileNav: () => void
}

/**
 * Client/UI-only state (ARCHITECTURE.md §4: only client/UI state lives in
 * Zustand — server state stays in TanStack Query). Sidebar collapse is
 * persisted since it's a layout preference; mobile drawer open state is not
 * (it should always start closed on a fresh load/navigation).
 */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      isSidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
      isMobileNavOpen: false,
      openMobileNav: () => set({ isMobileNavOpen: true }),
      closeMobileNav: () => set({ isMobileNavOpen: false }),
    }),
    {
      name: 'daisy-minds-ui-store',
      partialize: (state) => ({ isSidebarCollapsed: state.isSidebarCollapsed }),
    },
  ),
)
