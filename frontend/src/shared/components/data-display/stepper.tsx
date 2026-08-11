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

/** Horizontal multi-step progress indicator (e.g. a multi-step enrollment or wizard form). */
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
                  'text-caption flex size-8 shrink-0 items-center justify-center rounded-full border-2 font-semibold',
                  isComplete && 'border-primary bg-primary text-primary-foreground',
                  isCurrent && 'border-primary text-foreground bg-background',
                  !isComplete && !isCurrent && 'border-border text-muted-foreground bg-background',
                )}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {isComplete ? <Check className="size-4" /> : index + 1}
              </div>
              {index < steps.length - 1 && (
                <div className={cn('mx-2 h-0.5 flex-1', isComplete ? 'bg-primary' : 'bg-border')} />
              )}
            </div>
            <div className="mt-2 max-w-28 text-center">
              <p
                className={cn(
                  'text-body-sm font-medium',
                  !isCurrent && !isComplete && 'text-muted-foreground',
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
