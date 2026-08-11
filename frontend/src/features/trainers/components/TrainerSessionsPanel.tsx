import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Laptop, LogOut, Smartphone } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { ListSkeleton } from '@/shared/components/feedback/skeletons'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { ConfirmDialog } from '@/shared/components/overlays/confirm-dialog'
import {
  useForceLogoutAll,
  useForceLogoutSession,
  useTrainerSessions,
} from '@/features/trainers/hooks/use-trainer-sessions'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { toast } from '@/shared/lib/toast'

function isMobileUserAgent(userAgent: string): boolean {
  return /mobile|android|iphone/i.test(userAgent)
}

export function TrainerSessionsPanel({ trainerId, name }: { trainerId: string; name: string }) {
  const sessionsQuery = useTrainerSessions(trainerId)
  const forceLogoutSession = useForceLogoutSession(trainerId)
  const forceLogoutAll = useForceLogoutAll(trainerId)
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null)
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false)

  if (sessionsQuery.isLoading) {
    return <ListSkeleton rows={3} />
  }
  if (sessionsQuery.isError) {
    return (
      <ErrorState
        description={getSafeErrorMessage(sessionsQuery.error)}
        onRetry={() => void sessionsQuery.refetch()}
      />
    )
  }

  const sessions = sessionsQuery.data ?? []

  return (
    <div className="flex flex-col gap-3">
      {sessions.length > 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-destructive gap-1.5 self-end"
          onClick={() => {
            setConfirmLogoutAll(true)
          }}
        >
          <LogOut className="size-3.5" />
          Force logout everywhere
        </Button>
      )}

      {sessions.length === 0 ? (
        <EmptyState
          icon={LogOut}
          title="No active sessions"
          description={`${name} is not signed in anywhere.`}
        />
      ) : (
        sessions.map((session) => {
          const Icon =
            session.userAgent && isMobileUserAgent(session.userAgent) ? Smartphone : Laptop
          return (
            <div
              key={session.id}
              className="border-border flex items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-full">
                  <Icon className="text-muted-foreground size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-body-sm truncate font-medium">
                    {session.userAgent ?? 'Unknown device'}
                  </p>
                  <p className="text-caption text-muted-foreground">
                    Last active{' '}
                    {session.lastUsedAt
                      ? formatDistanceToNow(new Date(session.lastUsedAt), { addSuffix: true })
                      : 'never'}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={forceLogoutSession.isPending}
                onClick={() => {
                  setPendingSessionId(session.id)
                }}
              >
                Revoke
              </Button>
            </div>
          )
        })
      )}

      <ConfirmDialog
        open={pendingSessionId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingSessionId(null)
        }}
        title="Revoke this session?"
        description="This device will be signed out immediately."
        tone="destructive"
        confirmLabel="Revoke"
        isConfirming={forceLogoutSession.isPending}
        onConfirm={() => {
          if (!pendingSessionId) return
          forceLogoutSession.mutate(pendingSessionId, {
            onSuccess: () => {
              setPendingSessionId(null)
            },
            onError: (error) => {
              toast.error('Could not revoke session', getSafeErrorMessage(error))
              setPendingSessionId(null)
            },
          })
        }}
      />

      <ConfirmDialog
        open={confirmLogoutAll}
        onOpenChange={setConfirmLogoutAll}
        title="Force logout everywhere?"
        description={`${name} will be signed out of every device.`}
        tone="destructive"
        confirmLabel="Log out everywhere"
        isConfirming={forceLogoutAll.isPending}
        onConfirm={() => {
          forceLogoutAll.mutate(undefined, {
            onSettled: () => {
              setConfirmLogoutAll(false)
            },
          })
        }}
      />
    </div>
  )
}
