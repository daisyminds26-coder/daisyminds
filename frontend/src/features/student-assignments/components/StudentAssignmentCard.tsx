import { Link } from 'react-router-dom'

import { Card, CardContent } from '@/shared/components/ui/card'
import { buttonVariants } from '@/shared/components/ui/button'
import { StatusBadge, type StatusTone } from '@/shared/components/data-display/status-badge'
import { cn } from '@/shared/lib/utils'
import type {
  StudentAssignment,
  StudentSubmissionState,
} from '@/features/student-assignments/types'

const STATE_TONE: Record<StudentSubmissionState, StatusTone> = {
  UNSUBMITTED: 'neutral',
  DRAFT: 'warning',
  SUBMITTED: 'info',
  RETURNED: 'error',
  GRADED: 'success',
}

const STATE_LABEL: Record<StudentSubmissionState, string> = {
  UNSUBMITTED: 'Not submitted',
  DRAFT: 'Draft saved',
  SUBMITTED: 'Submitted',
  RETURNED: 'Returned — resubmit',
  GRADED: 'Graded',
}

function formatDue(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: timezone,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

export function StudentAssignmentCard({ assignment }: { assignment: StudentAssignment }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <p className="text-body-sm font-medium">{assignment.title}</p>
            <p className="text-caption text-muted-foreground">
              {assignment.courseTitle} · {assignment.batchName}
            </p>
          </div>
          <StatusBadge
            label={STATE_LABEL[assignment.submissionState]}
            tone={STATE_TONE[assignment.submissionState]}
          />
        </div>

        <p className="text-body-sm text-muted-foreground">
          Due {formatDue(assignment.dueDateTime, assignment.timezone)}
        </p>

        {assignment.marksAwarded !== null && (
          <p className="text-body-sm font-medium">
            {assignment.marksAwarded}/{assignment.maxMarks} ({assignment.percentage}%)
            {assignment.passStatus && (
              <span
                className={assignment.passStatus === 'PASS' ? 'text-success' : 'text-destructive'}
              >
                {' '}
                · {assignment.passStatus === 'PASS' ? 'Passed' : 'Not passed'}
              </span>
            )}
          </p>
        )}

        <Link
          to={`/student/assignments/${assignment.id}`}
          className={cn(buttonVariants({ size: 'sm', variant: 'outline' }), 'w-full sm:w-fit')}
        >
          {assignment.submissionState === 'GRADED'
            ? 'View result'
            : assignment.canSubmit
              ? 'View & submit'
              : 'View assignment'}
        </Link>
      </CardContent>
    </Card>
  )
}
