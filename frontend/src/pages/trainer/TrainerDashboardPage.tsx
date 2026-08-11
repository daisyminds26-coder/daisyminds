import { BookOpen, ClipboardCheck, PenSquare, Video } from 'lucide-react'

import { PageContainer } from '@/shared/components/containers/page-container'
import { SectionContainer } from '@/shared/components/containers/section-container'
import { StatCard } from '@/shared/components/data-display/stat-card'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { Card, CardContent } from '@/shared/components/ui/card'

const stats = [
  { label: 'Assigned Courses', value: '5', icon: BookOpen },
  { label: 'Upcoming Live Classes', value: '3', icon: Video },
  { label: 'Pending Evaluations', value: '12', icon: PenSquare },
  { label: 'Attendance Marked Today', value: '2 / 4 batches', icon: ClipboardCheck },
]

export default function TrainerDashboardPage() {
  return (
    <PageContainer
      title="Dashboard"
      description="Your courses, classes, and evaluations at a glance."
    >
      <SectionContainer>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      </SectionContainer>

      <SectionContainer title="Today's Schedule">
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={Video}
              title="No live classes scheduled today"
              description="Classes you schedule will appear here."
            />
          </CardContent>
        </Card>
      </SectionContainer>
    </PageContainer>
  )
}
