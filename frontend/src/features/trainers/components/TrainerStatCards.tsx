import { CalendarCheck, GraduationCap, MailWarning, Users } from 'lucide-react'

import { StatCard } from '@/shared/components/data-display/stat-card'
import { StatCardSkeleton } from '@/shared/components/feedback/skeletons'
import { useTrainerStats } from '@/features/trainers/hooks/use-trainer-stats'

export function TrainerStatCards() {
  const stats = useTrainerStats()

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
      <StatCard label="Total Trainers" value={stats.total} icon={Users} />
      <StatCard label="Active" value={stats.active} icon={GraduationCap} />
      <StatCard label="Pending Verification" value={stats.pending} icon={MailWarning} />
      <StatCard label="Available to Teach" value={stats.available} icon={CalendarCheck} />
    </div>
  )
}
