import { CheckCircle2, Clock, PlayCircle, TimerOff } from 'lucide-react'

import { StatCard } from '@/shared/components/data-display/stat-card'
import { StatCardSkeleton } from '@/shared/components/feedback/skeletons'
import { useEnrollmentStats } from '@/features/enrollments/hooks/use-enrollment-stats'

export function EnrollmentStatCards() {
  const stats = useEnrollmentStats()

  if (stats.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <StatCardSkeleton key={index} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Active" value={stats.active} icon={PlayCircle} />
      <StatCard label="Confirmed" value={stats.confirmed} icon={CheckCircle2} />
      <StatCard label="Waitlisted" value={stats.waitlisted} icon={Clock} />
      <StatCard label="Suspended" value={stats.suspended} icon={TimerOff} />
    </div>
  )
}
