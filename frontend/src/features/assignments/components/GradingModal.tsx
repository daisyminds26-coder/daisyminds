import { useState } from 'react'

import { Modal } from '@/shared/components/overlays/modal'
import { Button } from '@/shared/components/ui/button'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import { Input } from '@/shared/components/ui/input'
import { Badge } from '@/shared/components/ui/badge'
import { SubmissionStatusBadge } from '@/features/assignments/components/SubmissionStatusBadge'
import type { AdminAssignment, AssignmentSubmission } from '@/features/assignments/types'

interface GradingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assignment: AdminAssignment
  submission: AssignmentSubmission | null
  history: AssignmentSubmission[]
  canReturn: boolean
  isGrading?: boolean
  isReturning?: boolean
  onGrade: (marksAwarded: number, feedback: string) => void
  onReturn: (reason: string) => void
}

/** The full grading workspace — response content, attempt history, and the grade/return actions. Shared by the admin and trainer detail pages; `canReturn` reflects each caller's own authorization (a trainer only when the assignment allows resubmission, an admin always). */
export function GradingModal({
  open,
  onOpenChange,
  assignment,
  submission,
  history,
  canReturn,
  isGrading = false,
  isReturning = false,
  onGrade,
  onReturn,
}: GradingModalProps) {
  const [marksAwarded, setMarksAwarded] = useState(() =>
    submission?.marksAwarded !== null && submission?.marksAwarded !== undefined
      ? String(submission.marksAwarded)
      : '',
  )
  const [feedback, setFeedback] = useState(() => submission?.feedback ?? '')
  const [returnReason, setReturnReason] = useState('')
  const [showReturnForm, setShowReturnForm] = useState(false)

  if (!submission) return null

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`${submission.studentName} — Attempt ${String(submission.attemptNumber)}`}
      description={`${assignment.title} · ${submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : 'Not submitted'}`}
      className="sm:max-w-2xl"
    >
      <div className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto pr-1">
        <div className="flex flex-wrap items-center gap-2">
          <SubmissionStatusBadge status={submission.status} />
          <Badge variant="outline">{submission.submittedLate ? 'Late' : 'On time'}</Badge>
        </div>

        {submission.textResponse && (
          <div className="flex flex-col gap-1">
            <Label>Text response</Label>
            <p className="text-body-sm border-border bg-muted/30 rounded-lg border p-3 whitespace-pre-wrap">
              {submission.textResponse}
            </p>
          </div>
        )}

        {submission.linkResponse && (
          <div className="flex flex-col gap-1">
            <Label>Link response</Label>
            <a
              href={submission.linkResponse}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary text-body-sm break-all underline"
            >
              {submission.linkResponse}
            </a>
          </div>
        )}

        {submission.files.length > 0 && (
          <div className="flex flex-col gap-1">
            <Label>Files</Label>
            <ul className="flex flex-col gap-1">
              {submission.files.map((file) => (
                <li key={file.id} className="text-body-sm">
                  {file.filename} ({(file.bytes / 1024).toFixed(0)} KB)
                </li>
              ))}
            </ul>
          </div>
        )}

        {history.length > 1 && (
          <div className="flex flex-col gap-1.5">
            <Label>Attempt history</Label>
            <ul className="border-border divide-border divide-y overflow-hidden rounded-lg border">
              {history.map((attempt) => (
                <li
                  key={attempt.id}
                  className="flex items-center justify-between gap-3 p-2 text-sm"
                >
                  <span>
                    Attempt {attempt.attemptNumber} ·{' '}
                    {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString() : '—'}
                  </span>
                  <SubmissionStatusBadge status={attempt.status} />
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="border-border flex flex-col gap-3 border-t pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="marks-awarded">Marks awarded (of {assignment.maxMarks})</Label>
              <Input
                id="marks-awarded"
                type="number"
                min={0}
                max={assignment.maxMarks}
                value={marksAwarded}
                onChange={(event) => {
                  setMarksAwarded(event.target.value)
                }}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="feedback">Feedback</Label>
            <Textarea
              id="feedback"
              rows={3}
              value={feedback}
              onChange={(event) => {
                setFeedback(event.target.value)
              }}
            />
          </div>

          {showReturnForm ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="return-reason">Return reason</Label>
              <Textarea
                id="return-reason"
                rows={2}
                value={returnReason}
                onChange={(event) => {
                  setReturnReason(event.target.value)
                }}
                placeholder="What needs to be redone?"
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowReturnForm(false)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isReturning || returnReason.trim().length === 0}
                  onClick={() => {
                    onReturn(returnReason.trim())
                  }}
                >
                  {isReturning ? 'Returning…' : 'Return for resubmission'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              {canReturn && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowReturnForm(true)
                  }}
                >
                  Return for resubmission
                </Button>
              )}
              <Button
                type="button"
                disabled={isGrading || marksAwarded.trim().length === 0}
                onClick={() => {
                  onGrade(Number(marksAwarded), feedback.trim())
                }}
              >
                {isGrading ? 'Saving…' : 'Save grade'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
