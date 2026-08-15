import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { PageContainer } from '@/shared/components/containers/page-container'
import { buttonVariants } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { cn } from '@/shared/lib/utils'
import { CreateEnrollmentWizard } from '@/features/enrollments/components/CreateEnrollmentWizard'

export default function EnrollmentCreatePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialBatchId = searchParams.get('batchId') ?? undefined

  return (
    <PageContainer
      title="Enrol a student"
      description="Select a student and a batch — the server decides whether a seat is reserved or the student is waitlisted."
      actions={
        <Link
          to="/admin/enrollments"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
        >
          <ArrowLeft className="size-3.5" />
          Back to enrolments
        </Link>
      }
    >
      <Card>
        <CardContent>
          <CreateEnrollmentWizard
            initialBatchId={initialBatchId}
            onDone={(enrollmentId) => {
              void navigate(`/admin/enrollments/${enrollmentId}`)
            }}
          />
        </CardContent>
      </Card>
    </PageContainer>
  )
}
