export const PLAN_DURATION_UNITS = ['days', 'months'] as const
export type PlanDurationUnit = (typeof PLAN_DURATION_UNITS)[number]

/**
 * Shape mirrors the eventual `GET /api/v1/public/plans` response — see
 * `data/plans.ts`. Plans are a commercial/learning-depth tier that applies
 * across programs (Foundation / Specialized / Bootcamp), independent of any
 * single program's own `duration`/`level` fields in `types/program.ts`.
 */
export interface Plan {
  id: string
  slug: string
  name: string
  shortName: string
  duration: string
  durationValue: number
  durationUnit: PlanDurationUnit
  price: number
  currency: string
  description: string
  features: string[]
  recommendedFor: string[]
  featured: boolean
  ctaLabel: string
}
