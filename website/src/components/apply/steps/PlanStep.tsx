import { ArrowLeft, ArrowRight, Check } from 'lucide-react'

import type { Plan } from '@/types/plan'
import { formatPlanPrice } from '@/data/plans'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/utils/cn'

interface PlanStepProps {
  plans: Plan[]
  selectedPlan?: Plan
  onSelect: (slug: string) => void
  onBack: () => void
  onContinue: () => void
}

/** Step 2 — select one of the three learning-path tiers. Selection-only (no navigation), unlike the marketing `PlanCard`, so it can live inline in the stepper. */
export function PlanStep({ plans, selectedPlan, onSelect, onBack, onContinue }: PlanStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-display-sm text-ink">Choose Your Path</h2>
        <p className="text-ink-muted text-body-sm mt-1">
          Pick the plan that fits your goals and timeline.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {plans.map((plan) => {
          const isSelected = plan.slug === selectedPlan?.slug
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => {
                onSelect(plan.slug)
              }}
              aria-pressed={isSelected}
              className={cn(
                'relative flex flex-col gap-3 rounded-2xl border p-5 text-left transition-colors',
                isSelected
                  ? 'border-primary bg-primary-soft'
                  : 'border-border-soft bg-surface hover:border-ink/20',
              )}
            >
              {plan.featured && (
                <Badge tone="primary" className="absolute -top-2.5 left-4">
                  Most Popular
                </Badge>
              )}
              <div className="flex items-center justify-between">
                <span className="text-ink text-sm font-bold">{plan.shortName}</span>
                {isSelected && <Check className="text-primary-dark size-5" aria-hidden="true" />}
              </div>
              <span className="text-ink font-display text-lg font-bold">
                {formatPlanPrice(plan)}
              </span>
              <span className="text-ink-soft text-xs font-medium">{plan.duration}</span>
              <p className="text-ink-muted text-body-sm">{plan.description}</p>
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={onBack}
          variant="ghost"
          size="lg"
          icon={<ArrowLeft className="size-4.5" />}
        >
          Back
        </Button>
        <Button
          onClick={onContinue}
          disabled={!selectedPlan}
          size="lg"
          trailingIcon={<ArrowRight className="size-4.5" />}
        >
          Continue
        </Button>
      </div>
    </div>
  )
}
