import { useMutation } from '@tanstack/react-query'

import { getLiveClassJoinDetails } from '@/features/student-live-classes/api/student-live-classes.api'

/**
 * A mutation, not a query — joining is a deliberate, one-shot user action
 * (clicking "Join Class"), and re-fetching join details on unrelated
 * re-renders would be wasteful (the join URL is short-lived-by-convention
 * and access/window-checked fresh on every call anyway).
 */
export function useJoinLiveClass() {
  return useMutation({
    mutationFn: (sessionId: string) => getLiveClassJoinDetails(sessionId),
  })
}
