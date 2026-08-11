import { CheckCircle2, Lock, MailWarning, Users } from 'lucide-react'

import { StatCard } from '@/shared/components/data-display/stat-card'
import { StatCardSkeleton } from '@/shared/components/feedback/skeletons'
import { useUserStats } from '@/features/users/hooks/use-user-stats'

export function UserStatCards() {
  const stats = useUserStats()

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
      <StatCard label="Total Users" value={stats.total} icon={Users} />
      <StatCard label="Active" value={stats.active} icon={CheckCircle2} />
      <StatCard label="Pending Verification" value={stats.pending} icon={MailWarning} />
      <StatCard label="Locked" value={stats.locked} icon={Lock} />
    </div>
  )
}
