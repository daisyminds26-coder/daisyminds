import type { ReactNode } from 'react'

import { cn } from '@/utils/cn'

type BadgeTone = 'neutral' | 'primary' | 'charcoal' | 'outline'

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-raised text-ink-muted border border-border-soft',
  primary: 'bg-primary text-primary-foreground',
  charcoal: 'bg-charcoal text-white',
  outline: 'border border-white/25 text-white',
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: BadgeTone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/** The small uppercase label that sits above nearly every section heading — a load-bearing part of the "editorial composition" the brief asks for. */
export function Eyebrow({
  children,
  tone = 'primary',
  className,
}: {
  children: ReactNode
  tone?: 'primary' | 'light'
  className?: string
}) {
  return (
    <span
      className={cn(
        'text-eyebrow inline-flex items-center gap-2 font-semibold tracking-[0.08em] uppercase',
        tone === 'primary' ? 'text-primary-dark' : 'text-white/70',
        className,
      )}
    >
      <span className={cn('h-px w-6', tone === 'primary' ? 'bg-primary-dark' : 'bg-white/50')} />
      {children}
    </span>
  )
}
