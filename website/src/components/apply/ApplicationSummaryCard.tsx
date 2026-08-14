import type { ProgramListItem } from '@/types/program'
import type { Plan } from '@/types/plan'
import { formatPlanPrice } from '@/data/plans'
import { cn } from '@/utils/cn'

interface ApplicationSummaryCardProps {
  program?: ProgramListItem
  plan?: Plan
  className?: string
}

/** The persistent Program/Plan/Duration/Price summary — desktop right rail, mobile collapsible-above-form (see `ApplyPage.tsx`). Renders honestly even with nothing selected yet, never a blank/broken card. */
export function ApplicationSummaryCard({ program, plan, className }: ApplicationSummaryCardProps) {
  return (
    <div
      className={cn('border-border-soft bg-surface shadow-soft rounded-2xl border p-6', className)}
    >
      <p className="text-ink-soft text-xs font-semibold tracking-wide uppercase">
        Your Application
      </p>

      <dl className="mt-4 flex flex-col gap-4">
        <div>
          <dt className="text-ink-soft text-xs font-medium">Program</dt>
          <dd className="text-ink mt-0.5 text-sm font-semibold">
            {program ? program.title : 'Not selected yet'}
          </dd>
        </div>
        <div>
          <dt className="text-ink-soft text-xs font-medium">Plan</dt>
          <dd className="text-ink mt-0.5 text-sm font-semibold">
            {plan ? plan.name : 'Not selected yet'}
          </dd>
        </div>
        <div>
          <dt className="text-ink-soft text-xs font-medium">Duration</dt>
          <dd className="text-ink mt-0.5 text-sm font-semibold">{plan ? plan.duration : '—'}</dd>
        </div>
        <div>
          <dt className="text-ink-soft text-xs font-medium">Price</dt>
          <dd className="text-ink font-display mt-0.5 text-lg font-bold">
            {plan ? formatPlanPrice(plan) : '—'}
          </dd>
        </div>
      </dl>
    </div>
  )
}
