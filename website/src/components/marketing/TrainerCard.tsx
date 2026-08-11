import type { Trainer } from '@/types/trainer'

/** No stock headshots — a monogram tile keeps the identity system consistent (same pattern the LMS itself uses for avatar fallbacks) until real trainer photography exists. */
export function TrainerCard({ trainer }: { trainer: Trainer }) {
  return (
    <div className="border-border-soft bg-surface shadow-soft group flex h-full flex-col gap-4 rounded-2xl border p-6 transition-transform duration-300 hover:-translate-y-1">
      <div className="bg-charcoal text-primary font-display flex size-14 items-center justify-center rounded-2xl text-lg font-bold">
        {trainer.initials}
      </div>
      <div>
        <h3 className="text-ink text-lg font-bold">{trainer.name}</h3>
        <p className="text-primary-dark text-sm font-semibold">{trainer.role}</p>
      </div>
      <p className="text-ink-muted text-body-sm">{trainer.bio}</p>
      <ul className="mt-auto flex flex-wrap gap-1.5">
        {trainer.expertise.map((skill) => (
          <li
            key={skill}
            className="bg-surface-raised text-ink-muted border-border-soft rounded-full border px-2.5 py-1 text-xs font-medium"
          >
            {skill}
          </li>
        ))}
      </ul>
    </div>
  )
}
