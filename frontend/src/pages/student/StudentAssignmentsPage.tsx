import { useMemo } from 'react'
import { ClipboardList } from 'lucide-react'

import { PageContainer } from '@/shared/components/containers/page-container'
import { SectionContainer } from '@/shared/components/containers/section-container'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { ListSkeleton } from '@/shared/components/feedback/skeletons'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { StudentAssignmentCard } from '@/features/student-assignments/components/StudentAssignmentCard'
import { useMyAssignments } from '@/features/student-assignments/hooks/use-my-assignments'
import type { StudentAssignment } from '@/features/student-assignments/types'

function CardGrid({ assignments }: { assignments: StudentAssignment[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {assignments.map((assignment) => (
        <StudentAssignmentCard key={assignment.id} assignment={assignment} />
      ))}
    </div>
  )
}

export default function StudentAssignmentsPage() {
  const assignmentsQuery = useMyAssignments()

  const groups = useMemo(() => {
    const assignments = assignmentsQuery.data ?? []
    const actionNeeded: StudentAssignment[] = []
    const submitted: StudentAssignment[] = []
    const graded: StudentAssignment[] = []
    const past: StudentAssignment[] = []

    for (const assignment of assignments) {
      if (assignment.submissionState === 'GRADED') graded.push(assignment)
      else if (assignment.submissionState === 'SUBMITTED') submitted.push(assignment)
      else if (assignment.canSubmit) actionNeeded.push(assignment)
      else past.push(assignment)
    }

    actionNeeded.sort((a, b) => a.dueDateTime.localeCompare(b.dueDateTime))
    return { actionNeeded, submitted, graded, past }
  }, [assignmentsQuery.data])

  return (
    <PageContainer title="Assignments" description="Graded tasks for your enrolled courses.">
      {assignmentsQuery.isError && (
        <ErrorState
          description={getSafeErrorMessage(assignmentsQuery.error)}
          onRetry={() => void assignmentsQuery.refetch()}
        />
      )}

      {assignmentsQuery.isLoading && <ListSkeleton rows={3} />}

      {assignmentsQuery.data && (
        <>
          <SectionContainer title="Due &amp; Action Needed">
            {groups.actionNeeded.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="Nothing due right now"
                description="New assignments and anything returned for resubmission will appear here."
              />
            ) : (
              <CardGrid assignments={groups.actionNeeded} />
            )}
          </SectionContainer>

          {groups.submitted.length > 0 && (
            <SectionContainer title="Submitted — awaiting grading">
              <CardGrid assignments={groups.submitted} />
            </SectionContainer>
          )}

          {groups.graded.length > 0 && (
            <SectionContainer title="Graded">
              <CardGrid assignments={groups.graded} />
            </SectionContainer>
          )}

          {groups.past.length > 0 && (
            <SectionContainer title="Past">
              <CardGrid assignments={groups.past} />
            </SectionContainer>
          )}
        </>
      )}
    </PageContainer>
  )
}
