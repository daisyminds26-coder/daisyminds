import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'

/**
 * Explicit-save editors (the text lesson content editor) can hold real
 * admin work uncommitted for a while — this blocks both in-app navigation
 * (via the Data Router's `useBlocker`) and a hard tab close/reload (via
 * `beforeunload`) whenever there are unsaved changes, per the task's "warn
 * on navigation with unsaved changes" requirement.
 */
export function useUnsavedChangesGuard(hasUnsavedChanges: boolean) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!hasUnsavedChanges) return
      event.preventDefault()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [hasUnsavedChanges])

  return blocker
}
