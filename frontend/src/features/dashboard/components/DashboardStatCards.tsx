import {
  BookOpen,
  GraduationCap,
  Lock,
  ShieldAlert,
  UserPlus,
  Users,
  UsersRound,
} from 'lucide-react'

import { StatCard } from '@/shared/components/data-display/stat-card'
import { StatCardSkeleton } from '@/shared/components/feedback/skeletons'
import type { DashboardSummary } from '@/features/dashboard/types'

const PERIOD_LABEL: Record<string, string> = {
  TODAY: 'today',
  LAST_7_DAYS: 'last 7 days',
  LAST_30_DAYS: 'last 30 days',
  THIS_MONTH: 'this month',
  THIS_YEAR: 'this year',
  CUSTOM: 'selected period',
}

/**
 * Six primary cards (UI-DESIGN-SYSTEM.md §11 — "no dozen equally-weighted
 * stat cards"): 3 cumulative totals + 3 period-scoped counts. No trend
 * arrows — the backend has no prior-period comparison (no historical
 * snapshot system exists yet), and the phase spec explicitly forbids
 * inventing one. Secondary metrics (locked/pending/incomplete-profile
 * counts) live in the alerts panel instead of a 7th+ card.
 */
export function DashboardStatCards({
  summary,
  range,
  isLoading,
}: {
  summary: DashboardSummary | undefined
  range: string
  isLoading: boolean
}) {
  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <StatCardSkeleton key={index} />
        ))}
      </div>
    )
  }

  const periodLabel = PERIOD_LABEL[range] ?? 'selected period'

  const cards = [
    { label: 'Active students', value: summary.activeStudents, icon: GraduationCap },
    { label: 'Active trainers', value: summary.activeTrainers, icon: Users },
    { label: 'Active users', value: summary.activeUsers, icon: UsersRound },
    { label: `New students (${periodLabel})`, value: summary.newStudents, icon: UserPlus },
    { label: `New trainers (${periodLabel})`, value: summary.newTrainers, icon: UserPlus },
    {
      label: 'Pending verification',
      value: summary.pendingVerificationAccounts,
      icon: ShieldAlert,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <StatCard key={card.label} label={card.label} value={card.value} icon={card.icon} />
      ))}
    </div>
  )
}

/** Secondary metrics — locked accounts, incomplete profiles — deliberately kept out of the primary grid above. */
export function DashboardSecondaryStats({ summary }: { summary: DashboardSummary }) {
  const items = [
    { label: 'Locked accounts', value: summary.lockedAccounts, icon: Lock },
    { label: 'Suspended accounts', value: summary.suspendedAccounts, icon: ShieldAlert },
    {
      label: 'Incomplete student profiles',
      value: summary.incompleteStudentProfiles,
      icon: GraduationCap,
    },
    { label: 'Incomplete trainer profiles', value: summary.incompleteTrainerProfiles, icon: Users },
    { label: 'Published courses', value: summary.publishedCourses, icon: BookOpen },
  ]

  return (
    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="border-border flex flex-col gap-1 rounded-lg border p-4">
          <dt className="text-caption text-muted-foreground flex items-center gap-1.5">
            <item.icon className="size-3.5" />
            {item.label}
          </dt>
          <dd className="text-h3 font-semibold">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
