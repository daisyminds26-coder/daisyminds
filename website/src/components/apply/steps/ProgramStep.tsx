import { ArrowRight, Check } from 'lucide-react'

import type { Program } from '@/types/program'
import { ProgramIcon } from '@/components/marketing/ProgramIcon'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'

interface ProgramStepProps {
  programs: Program[]
  selectedProgram?: Program
  onSelect: (slug: string) => void
  onContinue: () => void
}

/** Step 1 — shows the already-selected program (changeable) or, if none was carried over via `?program=`, prompts a selection from all nine before continuing. */
export function ProgramStep({ programs, selectedProgram, onSelect, onContinue }: ProgramStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-display-sm text-ink">Choose Your Program</h2>
        <p className="text-ink-muted text-body-sm mt-1">
          {selectedProgram
            ? "Your selected program is shown below — pick a different one if you'd like to change it."
            : 'Select the program you want to apply for.'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {programs.map((program) => {
          const isSelected = program.slug === selectedProgram?.slug
          return (
            <button
              key={program.slug}
              type="button"
              onClick={() => {
                onSelect(program.slug)
              }}
              aria-pressed={isSelected}
              className={cn(
                'flex items-center gap-3 rounded-xl border p-4 text-left transition-colors',
                isSelected
                  ? 'border-primary bg-primary-soft'
                  : 'border-border-soft bg-surface hover:border-ink/20',
              )}
            >
              <span
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-full',
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-surface-raised text-ink-muted',
                )}
              >
                {isSelected ? (
                  <Check className="size-5" />
                ) : (
                  <ProgramIcon name={program.icon} className="size-5" />
                )}
              </span>
              <span>
                <span className="text-ink block text-sm font-semibold">{program.title}</span>
                <span className="text-ink-soft block text-xs">{program.category}</span>
              </span>
            </button>
          )
        })}
      </div>

      <Button
        onClick={onContinue}
        disabled={!selectedProgram}
        size="lg"
        className="w-fit"
        trailingIcon={<ArrowRight className="size-4.5" />}
      >
        Continue
      </Button>
    </div>
  )
}
