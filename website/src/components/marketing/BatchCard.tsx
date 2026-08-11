import { Link } from 'react-router-dom'
import { CalendarDays, Clock, Users } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import type { UpcomingBatch } from '@/types/batch'

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export function BatchCard({ batch }: { batch: UpcomingBatch }) {
  const isFillingFast = batch.seatsRemaining <= 5

  return (
    <Link
      to={`/programs/${batch.programSlug}`}
      className="group border-border-soft bg-surface shadow-soft hover:shadow-lifted flex h-full flex-col gap-4 rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-ink text-base font-bold text-balance">
          {batch.programTitle}
        </h3>
        <Badge tone={isFillingFast ? 'primary' : 'neutral'} className="shrink-0">
          {isFillingFast ? 'Filling fast' : 'Open'}
        </Badge>
      </div>

      <dl className="text-ink-muted flex flex-col gap-2 text-sm">
        <div className="flex items-center gap-2">
          <CalendarDays className="text-ink-soft size-4 shrink-0" aria-hidden="true" />
          <dt className="sr-only">Start date</dt>
          <dd>Starts {dateFormatter.format(new Date(batch.startDate))}</dd>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="text-ink-soft size-4 shrink-0" aria-hidden="true" />
          <dt className="sr-only">Schedule</dt>
          <dd>{batch.timeSlot}</dd>
        </div>
        <div className="flex items-center gap-2">
          <Users className="text-ink-soft size-4 shrink-0" aria-hidden="true" />
          <dt className="sr-only">Seats remaining</dt>
          <dd>
            {batch.seatsRemaining} seats left · {batch.mode}
          </dd>
        </div>
      </dl>

      <span className="text-primary-dark mt-auto text-sm font-semibold group-hover:underline">
        View program details →
      </span>
    </Link>
  )
}
