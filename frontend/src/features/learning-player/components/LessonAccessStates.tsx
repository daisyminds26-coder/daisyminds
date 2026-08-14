import { Lock, ShieldAlert } from 'lucide-react'

import { Card, CardContent } from '@/shared/components/ui/card'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import type { EnrollmentAccessState } from '@/features/student-portal/types'

export function LockedLessonView({ reason }: { reason: string | null }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <EmptyState
          icon={Lock}
          title="This lesson is locked"
          description={reason ?? 'Complete the required lesson first.'}
        />
      </CardContent>
    </Card>
  )
}

const ACCESS_MESSAGES: Partial<
  Record<EnrollmentAccessState, { title: string; description: string }>
> = {
  SUSPENDED: {
    title: 'Your course access is currently paused',
    description:
      'Contact support if you think this is a mistake — this lesson will be back as soon as access resumes.',
  },
  ENDED: {
    title: 'Your access to this course has ended',
    description: 'Reach out to support if you believe this is incorrect.',
  },
}

export function NoAccessLessonView({ accessState }: { accessState: EnrollmentAccessState }) {
  const message = ACCESS_MESSAGES[accessState] ?? {
    title: 'You do not currently have access to this lesson',
    description: 'Reach out to support if you believe this is incorrect.',
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <EmptyState icon={ShieldAlert} title={message.title} description={message.description} />
      </CardContent>
    </Card>
  )
}
