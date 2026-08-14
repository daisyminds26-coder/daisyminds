import { ClipboardList, TrendingUp, Trophy } from 'lucide-react'

/** Attendance and Live Classes shipped in Phase 12 — see the batch's own "Live Classes" tab (with an attendance sub-tab per session) instead of a placeholder here. */
const FUTURE_MODULES = [
  { label: 'Assignments', icon: ClipboardList },
  { label: 'Progress', icon: TrendingUp },
  { label: 'Certificates', icon: Trophy },
] as const

/** Honest placeholders only — never a fabricated "0%"/"0 completed" figure for a module that doesn't exist yet. */
export function FutureModuleCards() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {FUTURE_MODULES.map(({ label, icon: Icon }) => (
        <div
          key={label}
          className="border-border text-muted-foreground flex flex-col items-center gap-2 rounded-lg border border-dashed p-4 text-center"
        >
          <Icon className="size-5" aria-hidden="true" />
          <p className="text-body-sm text-foreground font-medium">{label}</p>
          <p className="text-caption">Available in a later phase</p>
        </div>
      ))}
    </div>
  )
}
