import { Award, BookOpen, CalendarCheck, FileText } from 'lucide-react'

import { PageContainer } from '@/shared/components/containers/page-container'
import { SectionContainer } from '@/shared/components/containers/section-container'
import { StatCard } from '@/shared/components/data-display/stat-card'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { Card, CardContent } from '@/shared/components/ui/card'

const stats = [
  { label: 'Enrolled Courses', value: '3', icon: BookOpen },
  { label: 'Attendance', value: '92%', icon: CalendarCheck },
  { label: 'Pending Assignments', value: '2', icon: FileText },
  { label: 'Certificates Earned', value: '1', icon: Award },
]

export default function StudentDashboardPage() {
  return (
    <PageContainer title="Dashboard" description="Your learning progress at a glance.">
      <SectionContainer>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      </SectionContainer>

      <SectionContainer title="Upcoming Live Classes">
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={CalendarCheck}
              title="No upcoming live classes"
              description="Classes for your enrolled courses will appear here."
            />
          </CardContent>
        </Card>
      </SectionContainer>
    </PageContainer>
  )
}
