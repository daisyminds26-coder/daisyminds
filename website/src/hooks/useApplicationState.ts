import { useCallback, useEffect, useState } from 'react'

export const APPLICATION_STEPS = ['program', 'plan', 'account', 'payment'] as const
export type ApplicationStep = (typeof APPLICATION_STEPS)[number]

interface ApplicationSelection {
  programSlug: string | null
  planSlug: string | null
  step: ApplicationStep
}

const STORAGE_KEY = 'daisyminds:application'

function readStoredSelection(): ApplicationSelection {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return { programSlug: null, planSlug: null, step: 'program' }
    const parsed = JSON.parse(raw) as Partial<ApplicationSelection>
    return {
      programSlug: parsed.programSlug ?? null,
      planSlug: parsed.planSlug ?? null,
      step: parsed.step && APPLICATION_STEPS.includes(parsed.step) ? parsed.step : 'program',
    }
  } catch {
    return { programSlug: null, planSlug: null, step: 'program' }
  }
}

/**
 * Persists only non-sensitive application-selection context (which program,
 * which plan, which step) to `sessionStorage` — this is exactly the "URL
 * state / sessionStorage for non-sensitive selection context" the apply
 * flow's architecture calls for. It never stores auth tokens, passwords, or
 * payment data; those live in component state only and are lost on refresh
 * by design (see `services/auth-service.ts`).
 */
export function useApplicationState(initial: { programSlug?: string; planSlug?: string }) {
  const [selection, setSelection] = useState<ApplicationSelection>(() => {
    const stored = readStoredSelection()
    return {
      programSlug: initial.programSlug ?? stored.programSlug,
      planSlug: initial.planSlug ?? stored.planSlug,
      step: stored.step,
    }
  })

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(selection))
  }, [selection])

  const setProgramSlug = useCallback((programSlug: string | null) => {
    setSelection((current) => ({ ...current, programSlug }))
  }, [])

  const setPlanSlug = useCallback((planSlug: string | null) => {
    setSelection((current) => ({ ...current, planSlug }))
  }, [])

  const setStep = useCallback((step: ApplicationStep) => {
    setSelection((current) => ({ ...current, step }))
  }, [])

  return { ...selection, setProgramSlug, setPlanSlug, setStep }
}
