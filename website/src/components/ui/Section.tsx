import type { ReactNode } from 'react'

import { cn } from '@/utils/cn'

type SectionTone = 'default' | 'surface' | 'charcoal' | 'tint'

interface SectionProps {
  children?: ReactNode
  className?: string
  id?: string
  tone?: SectionTone
  /** Adds the restrained dot-grid texture — used sparingly, never on adjacent sections. */
  grid?: boolean
  /** Removes the default vertical rhythm for sections that need custom spacing (e.g. the hero). */
  spacing?: 'default' | 'compact' | 'none'
}

const TONE_CLASSES: Record<SectionTone, string> = {
  default: 'bg-background text-foreground',
  surface: 'bg-surface text-foreground',
  charcoal: 'bg-charcoal text-white',
  tint: 'bg-primary-soft/40 text-foreground',
}

const SPACING_CLASSES: Record<NonNullable<SectionProps['spacing']>, string> = {
  default: 'py-20 sm:py-28',
  compact: 'py-14 sm:py-20',
  none: '',
}

/** The single section-level chrome primitive — every homepage narrative section (Hero excluded, which owns its own layout) renders through this so vertical rhythm and tone stay systematic rather than ad hoc. */
export function Section({
  children,
  className,
  id,
  tone = 'default',
  grid = false,
  spacing = 'default',
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn(
        'relative overflow-hidden',
        TONE_CLASSES[tone],
        SPACING_CLASSES[spacing],
        className,
      )}
    >
      {grid && (
        <div
          className={cn(
            'pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]',
            tone === 'charcoal' ? 'bg-grid-light' : 'bg-grid',
          )}
          aria-hidden="true"
        />
      )}
      <div className="relative">{children}</div>
    </section>
  )
}
