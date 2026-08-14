import { Link } from 'react-router-dom'
import { ArrowUpRight, Clock, Layers, MonitorSmartphone } from 'lucide-react'

import type { ProgramListItem } from '@/types/program'
import { formatEnumLabel } from '@/types/program'
import { ProgramIcon } from '@/components/marketing/ProgramIcon'
import { ProgramImageFallback } from '@/components/marketing/ProgramImageFallback'
import { ResponsiveImage } from '@/components/ui/ResponsiveImage'
import { programAccent, type ProgramAccent } from '@/utils/program-accent'
import { cn } from '@/utils/cn'

const ACCENT_CLASSES: Record<ProgramAccent, string> = {
  yellow: 'bg-primary text-charcoal',
  charcoal: 'bg-charcoal text-white',
  graphite: 'bg-graphite text-white',
}

const ACCENT_BORDER: Record<ProgramAccent, string> = {
  yellow: 'group-hover:border-primary-dark',
  charcoal: 'group-hover:border-charcoal',
  graphite: 'group-hover:border-graphite',
}

/**
 * Programs are presented as products, not course thumbnails — real,
 * program-specific photography where Course Management has it (never a
 * plain icon grid), a clear outcome statement, key skill tags, and
 * metadata a prospective learner actually needs before clicking through.
 * Desktop hover lifts the card and zooms the image; mobile treats the
 * whole card as one accessible tap target, no hover state required.
 */
export function ProgramCard({ program }: { program: ProgramListItem }) {
  const accent = programAccent(program.category)

  return (
    <Link
      to={`/programs/${program.slug}`}
      className={cn(
        'group border-border-soft bg-surface shadow-soft hover:shadow-lifted focus-visible:ring-primary-dark relative flex h-full flex-col overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-1 focus-visible:ring-2 focus-visible:outline-none',
        ACCENT_BORDER[accent],
      )}
    >
      <div className="relative overflow-hidden">
        {program.thumbnailUrl ? (
          <ResponsiveImage
            src={program.thumbnailUrl}
            alt={program.title}
            aspectRatio="4/3"
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <ProgramImageFallback aspectRatio="4/3" />
        )}
        <div
          className="from-charcoal/70 pointer-events-none absolute inset-0 bg-gradient-to-t via-transparent to-transparent"
          aria-hidden="true"
        />
        <span className="bg-charcoal/70 absolute top-4 left-4 rounded-full px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
          {program.category}
        </span>
        <span
          className={cn(
            'absolute right-4 bottom-4 flex size-11 items-center justify-center rounded-full shadow-lg',
            ACCENT_CLASSES[accent],
          )}
        >
          <ProgramIcon slug={program.slug} className="size-5" />
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex flex-col gap-2">
          <h3 className="font-display text-ink text-xl font-bold text-balance">{program.title}</h3>
          <p className="text-ink-muted text-body-sm line-clamp-2">{program.shortDescription}</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {program.skills.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="border-border-soft text-ink-muted rounded-full border px-2.5 py-1 text-xs font-medium"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="text-ink-soft flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium">
          <span className="inline-flex items-center gap-1.5">
            <Layers className="size-3.5" aria-hidden="true" />
            {formatEnumLabel(program.level)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MonitorSmartphone className="size-3.5" aria-hidden="true" />
            {formatEnumLabel(program.deliveryMode)}
          </span>
          {program.duration && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" aria-hidden="true" />
              {program.duration}
            </span>
          )}
        </div>

        <span className="text-primary-dark mt-auto inline-flex items-center gap-1.5 text-sm font-semibold">
          Explore Program
          <ArrowUpRight
            className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden="true"
          />
        </span>
      </div>
    </Link>
  )
}
