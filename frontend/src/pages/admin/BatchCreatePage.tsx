import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { PageContainer } from '@/shared/components/containers/page-container'
import { buttonVariants } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { cn } from '@/shared/lib/utils'
import { BatchCreateWizard } from '@/features/batches/components/BatchCreateWizard'

export default function BatchCreatePage() {
  const navigate = useNavigate()

  return (
    <PageContainer
      title="Create batch"
      description="Complete each step to schedule a new delivery instance of a course."
      actions={
        <Link
          to="/admin/batches"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
        >
          <ArrowLeft className="size-3.5" />
          Back to batches
        </Link>
      }
    >
      <Card>
        <CardContent>
          <BatchCreateWizard
            onDone={(batchId) => {
              void navigate(`/admin/batches/${batchId}`)
            }}
          />
        </CardContent>
      </Card>
    </PageContainer>
  )
}
