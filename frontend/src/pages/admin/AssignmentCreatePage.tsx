import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { PageContainer } from '@/shared/components/containers/page-container'
import { buttonVariants } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { AssignmentForm } from '@/features/assignments/components/AssignmentForm'

export default function AssignmentCreatePage() {
  const navigate = useNavigate()

  return (
    <PageContainer
      title="Create assignment"
      description="Author a graded task, target it to one or more batches of a course, and configure how students submit."
      actions={
        <Link
          to="/admin/assignments"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
        >
          <ArrowLeft className="size-3.5" />
          Back to assignments
        </Link>
      }
    >
      <AssignmentForm
        onDone={(assignmentId) => {
          void navigate(`/admin/assignments/${assignmentId}`)
        }}
      />
    </PageContainer>
  )
}
