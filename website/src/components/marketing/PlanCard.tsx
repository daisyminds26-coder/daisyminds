import { Check } from 'lucide-react'

import type { Plan } from '@/types/plan'
import { formatPlanPrice } from '@/data/plans'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/utils/cn'

interface PlanCardProps {
  plan: Plan
  /** Program slug to carry through to `/apply` so a plan chosen from a program page keeps that program selected. */
  programSlug?: string
}

export function PlanCard({ plan, programSlug }: PlanCardProps) {
  const applyHref = programSlug
    ? `/apply?program=${programSlug}&plan=${plan.slug}`
    : `/apply?plan=${plan.slug}`

  return (
    <div
      className={cn(
        'relative flex h-full flex-col gap-6 rounded-2xl border p-8 transition-all duration-300',
        plan.featured
          ? 'border-primary bg-surface shadow-lifted lg:-translate-y-3'
          : 'border-border-soft bg-surface shadow-soft',
      )}
    >
      {plan.featured && (
        <Badge tone="primary" className="absolute -top-3 left-8">
          Most Popular
        </Badge>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="font-display text-ink text-xl font-bold">{plan.name}</h3>
        <p className="text-ink-muted text-body-sm">{plan.description}</p>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="font-display text-display-sm text-ink">{formatPlanPrice(plan)}</span>
        <span className="text-ink-soft text-sm font-medium">/ {plan.duration}</span>
      </div>

      <ul className="flex flex-col gap-2.5">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm">
            <Check className="text-primary-dark mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span className="text-ink-muted">{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        href={applyHref}
        size="lg"
        variant={plan.featured ? 'primary' : 'ghost'}
        className="mt-auto"
      >
        {plan.ctaLabel}
      </Button>
    </div>
  )
}
