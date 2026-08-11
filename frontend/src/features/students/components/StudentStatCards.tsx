import { AlertTriangle, CheckCircle2, GraduationCap, MailWarning } from 'lucide-react'

import { StatCard } from '@/shared/components/data-display/stat-card'
import { StatCardSkeleton } from '@/shared/components/feedback/skeletons'
import { useStudentStats } from '@/features/students/hooks/use-student-stats'

export function StudentStatCards() {
  const stats = useStudentStats()

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
      <StatCard label="Total Students" value={stats.total} icon={GraduationCap} />
      <StatCard label="Active" value={stats.active} icon={CheckCircle2} />
      <StatCard label="Pending Verification" value={stats.pending} icon={MailWarning} />
      <StatCard label="Incomplete Profiles" value={stats.incompleteProfiles} icon={AlertTriangle} />
    </div>
  )
}
