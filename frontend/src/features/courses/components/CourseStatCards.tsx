import { Archive, BookOpen, CheckCircle2, FileEdit } from 'lucide-react'

import { StatCard } from '@/shared/components/data-display/stat-card'
import { StatCardSkeleton } from '@/shared/components/feedback/skeletons'
import { useCourseStats } from '@/features/courses/hooks/use-course-stats'

export function CourseStatCards() {
  const stats = useCourseStats()

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
      <StatCard label="Total Courses" value={stats.total} icon={BookOpen} />
      <StatCard label="Published" value={stats.published} icon={CheckCircle2} />
      <StatCard label="Draft" value={stats.draft} icon={FileEdit} />
      <StatCard label="Archived" value={stats.archived} icon={Archive} />
    </div>
  )
}
