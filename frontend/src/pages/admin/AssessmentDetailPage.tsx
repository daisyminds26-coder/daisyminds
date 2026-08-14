import { useState } from 'react'
import { ArrowLeft, Download } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { PageContainer } from '@/shared/components/containers/page-container'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { PageLoader } from '@/shared/components/feedback/page-loader'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Modal } from '@/shared/components/overlays/modal'
import { Textarea } from '@/shared/components/ui/textarea'
import { Label } from '@/shared/components/ui/label'
import { cn } from '@/shared/lib/utils'
import { toast } from '@/shared/lib/toast'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { AssessmentStatusBadge } from '@/features/assessments/components/AssessmentStatusBadge'
import { AssessmentForm } from '@/features/assessments/components/AssessmentForm'
import { AssessmentSectionsEditor } from '@/features/assessments/components/AssessmentSectionsEditor'
import { AttemptsPanel } from '@/features/assessments/components/AttemptsPanel'
import { GradingModal } from '@/features/assessments/components/GradingModal'
import { ReadinessPanel } from '@/features/assessments/components/ReadinessPanel'
import { useAssessment } from '@/features/assessments/hooks/use-assessment'
import {
  useArchiveAssessment,
  useCancelAssessment,
  useCloseAssessment,
  usePublishAssessment,
  usePublishResults,
} from '@/features/assessments/hooks/use-assessment-lifecycle'
import { useReadinessCheck } from '@/features/assessments/hooks/use-readiness-check'
import {
  useAttempt,
  useAttemptsList,
  useGradeAttempt,
} from '@/features/assessments/hooks/use-attempts'
import { useResultsSummary } from '@/features/assessments/hooks/use-results-summary'
import { useExportResults } from '@/features/assessments/hooks/use-export-results'
import type {
  AttemptSummary,
  ListAttemptsParams,
  ReadinessResult,
} from '@/features/assessments/types'

export default function AssessmentDetailPage() {
  const { assessmentId } = useParams<{ assessmentId: string }>()
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [attemptFilter, setAttemptFilter] = useState<ListAttemptsParams>({})
  const [selectedAttempt, setSelectedAttempt] = useState<AttemptSummary | null>(null)
  const [readiness, setReadiness] = useState<ReadinessResult | null>(null)

  const assessmentQuery = useAssessment(assessmentId)
  const publishAssessment = usePublishAssessment()
  const closeAssessment = useCloseAssessment()
  const publishResults = usePublishResults()
  const archiveAssessment = useArchiveAssessment()
  const cancelAssessment = useCancelAssessment()
  const readinessCheck = useReadinessCheck()
  const attemptsQuery = useAttemptsList(assessmentId ?? '', attemptFilter)
  const resultsSummary = useResultsSummary(assessmentId ?? '')
  const exportResults = useExportResults()
  const selectedAttemptDetail = useAttempt(assessmentId ?? '', selectedAttempt?.id)
  const gradeAttempt = useGradeAttempt(assessmentId ?? '')

  if (assessmentQuery.isLoading) return <PageLoader />
  if (assessmentQuery.isError || !assessmentQuery.data) {
    return (
      <PageContainer title="Assessment">
        <ErrorState
          description={
            assessmentQuery.isError
              ? getSafeErrorMessage(assessmentQuery.error)
              : 'Assessment not found.'
          }
          onRetry={() => void assessmentQuery.refetch()}
        />
      </PageContainer>
    )
  }

  const assessment = assessmentQuery.data

  function handlePublishClick() {
    if (!assessmentId) return
    readinessCheck.mutate(assessmentId, {
      onSuccess: (result) => {
        setReadiness(result)
        if (result.ready) {
          publishAssessment.mutate(assessmentId, {
            onSuccess: () => toast.success('Assessment published'),
            onError: (error) =>
              toast.error('Could not publish assessment', getSafeErrorMessage(error)),
          })
        }
      },
      onError: (error) => toast.error('Could not check readiness', getSafeErrorMessage(error)),
    })
  }

  return (
    <PageContainer
      title={assessment.title}
      description={`${assessment.assessmentCode} · ${assessment.courseTitle}`}
      actions={
        <>
          <Link
            to="/admin/assessments"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
          >
            <ArrowLeft className="size-3.5" />
            Back to assessments
          </Link>
          {assessment.status === 'DRAFT' && (
            <Button
              type="button"
              size="sm"
              disabled={readinessCheck.isPending || publishAssessment.isPending}
              onClick={handlePublishClick}
            >
              Publish
            </Button>
          )}
          {assessment.status === 'PUBLISHED' && (
            <Button
              type="button"
              size="sm"
              disabled={closeAssessment.isPending}
              onClick={() => {
                if (!assessmentId) return
                closeAssessment.mutate(assessmentId, {
                  onSuccess: () => toast.success('Assessment closed'),
                  onError: (error) =>
                    toast.error('Could not close assessment', getSafeErrorMessage(error)),
                })
              }}
            >
              Close
            </Button>
          )}
          {assessment.status === 'CLOSED' && (
            <Button
              type="button"
              size="sm"
              disabled={publishResults.isPending}
              onClick={() => {
                if (!assessmentId) return
                publishResults.mutate(assessmentId, {
                  onSuccess: () => toast.success('Results published'),
                  onError: (error) =>
                    toast.error('Could not publish results', getSafeErrorMessage(error)),
                })
              }}
            >
              Publish Results
            </Button>
          )}
          {assessment.status === 'RESULT_PUBLISHED' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={archiveAssessment.isPending}
              onClick={() => {
                if (!assessmentId) return
                archiveAssessment.mutate(assessmentId, {
                  onSuccess: () => toast.success('Assessment archived'),
                  onError: (error) =>
                    toast.error('Could not archive assessment', getSafeErrorMessage(error)),
                })
              }}
            >
              Archive
            </Button>
          )}
          {(assessment.status === 'DRAFT' || assessment.status === 'PUBLISHED') && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive"
              onClick={() => {
                setCancelOpen(true)
              }}
            >
              Cancel
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <AssessmentStatusBadge status={assessment.status} />
        {assessment.status === 'PUBLISHED' && (
          <span className="text-body-sm text-muted-foreground">
            {assessment.isAcceptingAttempts
              ? 'Currently accepting attempts'
              : 'Outside its open/close window'}
          </span>
        )}
        {assessment.cancellationReason && (
          <span className="text-body-sm text-destructive">
            Cancelled: {assessment.cancellationReason}
          </span>
        )}
      </div>

      {readiness && assessment.status === 'DRAFT' && <ReadinessPanel readiness={readiness} />}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sections">Sections & Questions</TabsTrigger>
          <TabsTrigger value="attempts">Attempts & Results</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {assessment.status === 'DRAFT' ? (
            <AssessmentForm existing={assessment} onDone={() => void assessmentQuery.refetch()} />
          ) : (
            <Card>
              <CardContent className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2">
                {assessment.description && (
                  <div className="sm:col-span-2">
                    <p className="text-caption text-muted-foreground">Description</p>
                    <p className="text-body-sm whitespace-pre-wrap">{assessment.description}</p>
                  </div>
                )}
                {assessment.instructions && (
                  <div className="sm:col-span-2">
                    <p className="text-caption text-muted-foreground">Instructions</p>
                    <p className="text-body-sm whitespace-pre-wrap">{assessment.instructions}</p>
                  </div>
                )}
                <div>
                  <p className="text-caption text-muted-foreground">Target batches</p>
                  <p className="text-body-sm">
                    {assessment.batches.map((batch) => batch.name).join(', ')}
                  </p>
                </div>
                <div>
                  <p className="text-caption text-muted-foreground">Duration / Attempts</p>
                  <p className="text-body-sm">
                    {assessment.durationMinutes} min · max {assessment.maxAttempts} attempt(s)
                  </p>
                </div>
                <div>
                  <p className="text-caption text-muted-foreground">Questions / Marks</p>
                  <p className="text-body-sm">
                    {assessment.questionCount} questions · {assessment.totalMarks} marks
                  </p>
                </div>
                <div>
                  <p className="text-caption text-muted-foreground">Passing percentage</p>
                  <p className="text-body-sm">{assessment.passingPercentage ?? '—'}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sections">
          <AssessmentSectionsEditor assessment={assessment} />
        </TabsContent>

        <TabsContent value="attempts">
          <div className="flex flex-col gap-4">
            {resultsSummary.data && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {(
                  [
                    ['Total attempts', resultsSummary.data.totalAttempts],
                    ['Pending grading', resultsSummary.data.pendingGrading],
                    ['Graded', resultsSummary.data.graded],
                    ['Passed', resultsSummary.data.passed],
                    ['Failed', resultsSummary.data.failed],
                  ] as const
                ).map(([label, value]) => (
                  <Card key={label}>
                    <CardContent className="flex flex-col gap-1 pt-6">
                      <span className="text-caption text-muted-foreground">{label}</span>
                      <span className="text-h3 font-semibold">{value}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={exportResults.isPending}
                onClick={() => {
                  exportResults.mutate({ assessmentId })
                }}
              >
                <Download className="size-3.5" />
                Export CSV
              </Button>
            </div>
            <AttemptsPanel
              attempts={attemptsQuery.data ?? []}
              isLoading={attemptsQuery.isLoading}
              errorMessage={
                attemptsQuery.isError ? getSafeErrorMessage(attemptsQuery.error) : undefined
              }
              onRetry={() => void attemptsQuery.refetch()}
              filter={attemptFilter}
              onFilterChange={setAttemptFilter}
              onSelect={setSelectedAttempt}
            />
          </div>
        </TabsContent>
      </Tabs>

      <GradingModal
        key={selectedAttempt?.id ?? 'none'}
        open={selectedAttempt !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedAttempt(null)
        }}
        attempt={selectedAttemptDetail.data ?? null}
        isGrading={gradeAttempt.isPending}
        onGrade={(grades) => {
          if (!selectedAttempt) return
          gradeAttempt.mutate(
            { attemptId: selectedAttempt.id, payload: { grades } },
            {
              onSuccess: () => toast.success('Grades saved'),
              onError: (error) => toast.error('Could not save grades', getSafeErrorMessage(error)),
            },
          )
        }}
      />

      <Modal open={cancelOpen} onOpenChange={setCancelOpen} title="Cancel assessment">
        <div className="flex flex-col gap-3">
          <Label htmlFor="cancel-reason">Reason</Label>
          <Textarea
            id="cancel-reason"
            rows={3}
            value={cancelReason}
            onChange={(event) => {
              setCancelReason(event.target.value)
            }}
            placeholder="Why is this assessment being cancelled?"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCancelOpen(false)
              }}
            >
              Close
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={cancelAssessment.isPending || cancelReason.trim().length === 0}
              onClick={() => {
                if (!assessmentId) return
                cancelAssessment.mutate(
                  { id: assessmentId, reason: cancelReason.trim() },
                  {
                    onSuccess: () => {
                      toast.success('Assessment cancelled')
                      setCancelOpen(false)
                      setCancelReason('')
                    },
                    onError: (error) =>
                      toast.error('Could not cancel assessment', getSafeErrorMessage(error)),
                  },
                )
              }}
            >
              Confirm cancel
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  )
}
