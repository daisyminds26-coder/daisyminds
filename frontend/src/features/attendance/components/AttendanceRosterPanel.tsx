import { useState } from 'react'

import { Button } from '@/shared/components/ui/button'
import { ConfirmDialog } from '@/shared/components/overlays/confirm-dialog'
import { Modal } from '@/shared/components/overlays/modal'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import { toast } from '@/shared/lib/toast'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { AttendanceRosterTable } from '@/features/attendance/components/AttendanceRosterTable'
import { useSessionRoster } from '@/features/attendance/hooks/use-session-roster'
import { useBulkMarkAttendance } from '@/features/attendance/hooks/use-bulk-mark-attendance'
import {
  useFinalizeAttendance,
  useReopenAttendance,
} from '@/features/attendance/hooks/use-finalize-attendance'
import type { AttendanceStatus } from '@/features/attendance/types'

interface AttendanceRosterPanelProps {
  sessionId: string
  basePath?: string
  canFinalize?: boolean
}

/**
 * The full session-attendance workflow (roster + mark + finalize + reopen)
 * as one reusable panel — the admin session-detail page and the trainer
 * self-scoped attendance page both render this rather than duplicating the
 * mutation wiring (task's own "never duplicate business logic" rule).
 * `canFinalize` is false for the trainer surface: the backend's
 * `/api/v1/trainer/live-classes/*` namespace never exposes
 * finalize/reopen — only ADMIN/SUPER_ADMIN can finalize or reopen.
 */
export function AttendanceRosterPanel({
  sessionId,
  basePath = '/live-classes',
  canFinalize = false,
}: AttendanceRosterPanelProps) {
  const [pending, setPending] = useState<Record<string, AttendanceStatus>>({})
  const [confirmMarkAllOpen, setConfirmMarkAllOpen] = useState(false)
  const [reopenOpen, setReopenOpen] = useState(false)
  const [reopenReason, setReopenReason] = useState('')

  const rosterQuery = useSessionRoster(sessionId, basePath)
  const bulkMark = useBulkMarkAttendance(sessionId, basePath)
  const finalize = useFinalizeAttendance(sessionId)
  const reopen = useReopenAttendance(sessionId)

  const roster = rosterQuery.data?.roster ?? []
  const isFinalized = rosterQuery.data?.attendanceStatus === 'FINALIZED'
  const dirtyCount = Object.keys(pending).length

  function markOne(studentId: string, status: AttendanceStatus) {
    setPending((previous) => ({ ...previous, [studentId]: status }))
  }

  function markAllPresent() {
    const next: Record<string, AttendanceStatus> = { ...pending }
    for (const row of roster) next[row.studentId] = 'PRESENT'
    setPending(next)
    setConfirmMarkAllOpen(false)
  }

  function handleSave() {
    const records = Object.entries(pending).map(([studentId, status]) => ({ studentId, status }))
    if (records.length === 0) return
    bulkMark.mutate(records, {
      onSuccess: (result) => {
        setPending({})
        if (result.rejected.length > 0) {
          toast.warning(
            `${String(result.rejected.length)} student(s) could not be marked`,
            result.rejected.map((item) => item.reason).join('; '),
          )
        } else {
          toast.success('Attendance saved')
        }
      },
      onError: (error) => {
        toast.error('Could not save attendance', getSafeErrorMessage(error))
      },
    })
  }

  function handleReopen() {
    if (reopenReason.trim().length === 0) return
    reopen.mutate(reopenReason.trim(), {
      onSuccess: () => {
        toast.success('Attendance reopened')
        setReopenOpen(false)
        setReopenReason('')
      },
      onError: (error) => {
        toast.error('Could not reopen attendance', getSafeErrorMessage(error))
      },
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {!isFinalized && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setConfirmMarkAllOpen(true)
                }}
              >
                Mark all Present
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={dirtyCount === 0 || bulkMark.isPending}
                onClick={handleSave}
              >
                {bulkMark.isPending
                  ? 'Saving…'
                  : `Save${dirtyCount > 0 ? ` (${String(dirtyCount)})` : ''}`}
              </Button>
            </>
          )}
        </div>
        {canFinalize && (
          <div className="flex gap-2">
            {isFinalized ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setReopenOpen(true)
                }}
              >
                Reopen attendance
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={finalize.isPending}
                onClick={() => {
                  finalize.mutate(undefined, {
                    onSuccess: () => toast.success('Attendance finalized'),
                    onError: (error) =>
                      toast.error('Could not finalize attendance', getSafeErrorMessage(error)),
                  })
                }}
              >
                {finalize.isPending ? 'Finalizing…' : 'Finalize attendance'}
              </Button>
            )}
          </div>
        )}
      </div>

      {isFinalized && (
        <p className="text-body-sm text-muted-foreground">
          Attendance is finalized
          {rosterQuery.data?.attendanceFinalizedAt
            ? ` (${new Date(rosterQuery.data.attendanceFinalizedAt).toLocaleString()})`
            : ''}
          .{' '}
          {canFinalize
            ? 'Reopen it to make further changes.'
            : 'Ask an admin to reopen it to make changes.'}
        </p>
      )}

      <AttendanceRosterTable
        roster={roster}
        pending={pending}
        readOnly={isFinalized}
        isLoading={rosterQuery.isLoading}
        errorMessage={rosterQuery.isError ? getSafeErrorMessage(rosterQuery.error) : undefined}
        onRetry={() => void rosterQuery.refetch()}
        onMark={markOne}
      />

      <ConfirmDialog
        open={confirmMarkAllOpen}
        onOpenChange={setConfirmMarkAllOpen}
        title="Mark every student Present?"
        description="This overwrites any status you've already selected below (not yet saved). You can still adjust individual students afterward."
        confirmLabel="Mark all Present"
        onConfirm={markAllPresent}
      />

      {canFinalize && (
        <Modal
          open={reopenOpen}
          onOpenChange={(open) => {
            setReopenOpen(open)
            if (!open) setReopenReason('')
          }}
          title="Reopen attendance?"
          description="Provide a reason (required, audited) — this re-enables editing for this session."
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="reopen-reason">Reason</Label>
            <Textarea
              id="reopen-reason"
              rows={3}
              value={reopenReason}
              onChange={(event) => {
                setReopenReason(event.target.value)
              }}
              placeholder="e.g. Trainer reported a correction after finalizing"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setReopenOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={reopen.isPending || reopenReason.trim().length === 0}
              onClick={handleReopen}
            >
              {reopen.isPending ? 'Reopening…' : 'Reopen'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
