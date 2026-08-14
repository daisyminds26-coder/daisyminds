import { Check } from 'lucide-react'

import { APPLICATION_STEPS, type ApplicationStep } from '@/hooks/useApplicationState'
import { cn } from '@/utils/cn'

const STEP_LABELS: Record<ApplicationStep, string> = {
  program: 'Program',
  plan: 'Plan',
  account: 'Account',
  payment: 'Payment',
}

interface StepperNavProps {
  currentStep: ApplicationStep
  /** Steps the visitor has already completed and may jump back to. */
  reachableSteps: ApplicationStep[]
  onStepClick: (step: ApplicationStep) => void
}

/** The "1 Program / 2 Plan / 3 Account / 4 Payment" progress indicator — a labeled `<ol>`, not decorative dots, so it reads correctly to screen readers and stays legible at 44px touch targets on mobile. */
export function StepperNav({ currentStep, reachableSteps, onStepClick }: StepperNavProps) {
  const currentIndex = APPLICATION_STEPS.indexOf(currentStep)

  return (
    <ol className="flex items-center gap-1.5 sm:gap-3" aria-label="Application progress">
      {APPLICATION_STEPS.map((step, index) => {
        const isCurrent = step === currentStep
        const isComplete = index < currentIndex
        const isReachable = reachableSteps.includes(step)

        return (
          <li key={step} className="flex flex-1 items-center gap-1.5 sm:gap-3">
            <button
              type="button"
              disabled={!isReachable}
              aria-current={isCurrent ? 'step' : undefined}
              onClick={() => {
                onStepClick(step)
              }}
              className={cn(
                'flex min-h-11 w-full items-center gap-2 rounded-full border px-3 py-2 text-left text-xs font-semibold transition-colors sm:text-sm',
                isCurrent
                  ? 'border-primary bg-primary text-primary-foreground'
                  : isComplete
                    ? 'border-primary-dark/40 bg-primary-soft text-primary-dark'
                    : 'border-border-soft text-ink-soft',
                !isReachable && 'cursor-not-allowed opacity-60',
              )}
            >
              <span
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-full text-[0.7rem]',
                  isCurrent
                    ? 'bg-primary-foreground/20'
                    : isComplete
                      ? 'bg-primary-dark text-white'
                      : 'bg-surface-raised',
                )}
              >
                {isComplete ? <Check className="size-3" aria-hidden="true" /> : index + 1}
              </span>
              <span className="hidden sm:inline">{STEP_LABELS[step]}</span>
            </button>
            {index < APPLICATION_STEPS.length - 1 && (
              <span className="bg-border-soft hidden h-px flex-1 sm:block" aria-hidden="true" />
            )}
          </li>
        )
      })}
    </ol>
  )
}
