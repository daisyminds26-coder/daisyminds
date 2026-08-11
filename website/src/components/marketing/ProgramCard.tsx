import { Link } from 'react-router-dom'
import { ArrowUpRight, Clock, Layers, MonitorSmartphone } from 'lucide-react'

import type { Program } from '@/types/program'
import { cn } from '@/utils/cn'

const ACCENT_CLASSES: Record<Program['accent'], string> = {
  yellow: 'bg-primary',
  charcoal: 'bg-charcoal',
  graphite: 'bg-graphite',
}

/**
 * Programs are presented as products, not course thumbnails — a colored
 * identity band standing in for photography (no stock imagery), a clear
 * outcome statement, and metadata a prospective learner actually needs
 * before clicking through.
 */
export function ProgramCard({ program }: { program: Program }) {
  return (
    <Link
      to={`/programs/${program.slug}`}
      className="group border-border-soft bg-surface shadow-soft hover:shadow-lifted focus-visible:ring-primary-dark relative flex h-full flex-col overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-1 focus-visible:ring-2 focus-visible:outline-none"
    >
      <div className={cn('relative h-28 overflow-hidden', ACCENT_CLASSES[program.accent])}>
        <div
          className="absolute inset-0 [mask-image:radial-gradient(circle_at_top_right,black,transparent_70%)] opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle, rgb(255 255 255 / 0.6) 1px, transparent 1px)',
            backgroundSize: '16px 16px',
          }}
          aria-hidden="true"
        />
        <span
          className={cn(
            'absolute top-4 left-5 rounded-full px-3 py-1 text-xs font-semibold',
            program.accent === 'yellow'
              ? 'bg-charcoal/85 text-white'
              : 'bg-white/15 text-white backdrop-blur-sm',
          )}
        >
          {program.category}
        </span>
        <ArrowUpRight
          className={cn(
            'absolute right-5 bottom-4 size-6 -translate-y-1 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100',
            program.accent === 'yellow' ? 'text-charcoal' : 'text-white',
          )}
          aria-hidden="true"
        />
      </div>

      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex flex-col gap-2">
          <h3 className="font-display text-ink text-xl font-bold text-balance">{program.title}</h3>
          <p className="text-ink-muted text-body-sm line-clamp-2">{program.outcome}</p>
        </div>

        <div className="text-ink-soft mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium">
          <span className="inline-flex items-center gap-1.5">
            <Layers className="size-3.5" aria-hidden="true" />
            {program.level}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MonitorSmartphone className="size-3.5" aria-hidden="true" />
            {program.mode}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" aria-hidden="true" />
            {program.durationLabel}
          </span>
        </div>
      </div>
    </Link>
  )
}
