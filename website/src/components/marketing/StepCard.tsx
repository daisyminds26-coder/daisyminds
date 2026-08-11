import type { LucideIcon } from 'lucide-react'

export function StepCard({
  index,
  icon: Icon,
  title,
  description,
}: {
  index: number
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <div className="relative flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="border-border-soft bg-surface flex size-12 items-center justify-center rounded-2xl border">
          <Icon className="text-primary-dark size-5" aria-hidden="true" />
        </span>
        <span className="font-display text-border text-3xl font-bold">
          {String(index).padStart(2, '0')}
        </span>
      </div>
      <h3 className="text-ink text-lg font-bold">{title}</h3>
      <p className="text-ink-muted text-body-sm">{description}</p>
    </div>
  )
}
