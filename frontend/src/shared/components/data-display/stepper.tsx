import { Check } from 'lucide-react'

import { cn } from '@/shared/lib/utils'

export interface StepperStep {
  id: string
  label: string
  description?: string
}

interface StepperProps {
  steps: readonly StepperStep[]
  currentStepId: string
  className?: string
}

/** Horizontal multi-step progress indicator (e.g. a multi-step Enrollllment or wizard form). */
export function Stepper({ steps, currentStepId, className }: StepperProps) {
  const currentIndex = steps.findIndex((step) => step.id === currentStepId)

  return (
    <ol className={cn('flex w-full items-start', className)}>
      {steps.map((step, index) => {
        const isComplete = index < currentIndex
        const isCurrent = index === currentIndex

        return (
          <li key={step.id} className="flex flex-1 flex-col items-center last:flex-none">
            <div className="flex w-full items-center">
              <div
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-300',
                  (isComplete || isCurrent) && 'border-primary bg-primary text-primary-foreground',
                  isCurrent && 'ring-primary/20 shadow-primary/25 shadow-md ring-4',
                  !isComplete && !isCurrent && 'border-border text-muted-foreground bg-background',
                )}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {isComplete ? <Check className="size-4" /> : index + 1}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'mx-2 h-1 flex-1 rounded-full transition-colors duration-300',
                    isComplete ? 'bg-primary' : 'bg-border',
                  )}
                />
              )}
            </div>
            <div className="mt-3 max-w-28 text-center">
              <p
                className={cn(
                  'text-body-sm text-nowrap transition-colors duration-300',
                  isCurrent && 'text-foreground font-semibold',
                  isComplete && 'text-foreground font-medium',
                  !isCurrent && !isComplete && 'text-muted-foreground font-medium',
                )}
              >
                {step.label}
              </p>
              {step.description && (
                <p className="text-caption text-muted-foreground">{step.description}</p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
