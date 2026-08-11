import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { LogOut, ShieldX } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Form } from '@/shared/components/ui/form'
import { Card, CardContent } from '@/shared/components/ui/card'
import { PageContainer } from '@/shared/components/containers/page-container'
import { SectionContainer } from '@/shared/components/containers/section-container'
import { ListSkeleton } from '@/shared/components/feedback/skeletons'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { ConfirmDialog } from '@/shared/components/overlays/confirm-dialog'
import { PasswordField } from '@/features/auth/components/PasswordField'
import { SessionListItem } from '@/features/auth/components/SessionListItem'
import { useChangePassword } from '@/features/auth/hooks/use-password'
import { useLogout, useLogoutAll } from '@/features/auth/hooks/use-logout'
import { useRevokeSession, useSessions } from '@/features/auth/hooks/use-sessions'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { toast } from '@/shared/lib/toast'
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from '@/features/auth/schemas/auth.schemas'

function ChangePasswordSection() {
  const changePassword = useChangePassword()
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  function onSubmit(values: ChangePasswordFormValues) {
    changePassword.mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      {
        onSuccess: () => {
          toast.success('Password changed', 'Your other sessions have been signed out.')
          form.reset()
        },
        onError: (error) => {
          toast.error('Could not change password', getSafeErrorMessage(error))
        },
      },
    )
  }

  return (
    <SectionContainer
      title="Change password"
      description="Changing your password signs you out of every other device."
    >
      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form
              onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
              className="flex max-w-sm flex-col gap-4"
              noValidate
            >
              <PasswordField
                control={form.control}
                name="currentPassword"
                label="Current password"
                autoComplete="current-password"
                disabled={changePassword.isPending}
              />
              <PasswordField
                control={form.control}
                name="newPassword"
                label="New password"
                autoComplete="new-password"
                disabled={changePassword.isPending}
              />
              <PasswordField
                control={form.control}
                name="confirmPassword"
                label="Confirm new password"
                autoComplete="new-password"
                disabled={changePassword.isPending}
              />
              <Button type="submit" disabled={changePassword.isPending} className="self-start">
                {changePassword.isPending ? 'Changing…' : 'Change password'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </SectionContainer>
  )
}

function SessionsSection() {
  const sessionsQuery = useSessions()
  const revokeSession = useRevokeSession()
  const logout = useLogout()
  const logoutAll = useLogoutAll()
  const [pendingRevokeId, setPendingRevokeId] = useState<string | null>(null)
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false)

  return (
    <SectionContainer
      title="Active sessions"
      description="Devices currently signed in to your account."
      actions={
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              logout.mutate()
            }}
          >
            <LogOut className="size-3.5" />
            Log out this device
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-destructive gap-1.5"
            onClick={() => {
              setConfirmLogoutAll(true)
            }}
          >
            <ShieldX className="size-3.5" />
            Log out everywhere
          </Button>
        </div>
      }
    >
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          {sessionsQuery.isLoading ? (
            <ListSkeleton rows={3} />
          ) : sessionsQuery.isError ? (
            <ErrorState
              description={getSafeErrorMessage(sessionsQuery.error)}
              onRetry={() => void sessionsQuery.refetch()}
            />
          ) : !sessionsQuery.data || sessionsQuery.data.length === 0 ? (
            <EmptyState icon={LogOut} title="No active sessions" />
          ) : (
            sessionsQuery.data.map((session) => (
              <SessionListItem
                key={session.id}
                session={session}
                isRevoking={revokeSession.isPending}
                onRevoke={setPendingRevokeId}
              />
            ))
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={pendingRevokeId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRevokeId(null)
        }}
        title="Revoke this session?"
        description="This device will be signed out immediately and will need to sign in again."
        tone="destructive"
        confirmLabel="Revoke"
        isConfirming={revokeSession.isPending}
        onConfirm={() => {
          if (!pendingRevokeId) return
          revokeSession.mutate(pendingRevokeId, {
            onSuccess: () => {
              setPendingRevokeId(null)
            },
            onError: (error) => {
              toast.error('Could not revoke session', getSafeErrorMessage(error))
              setPendingRevokeId(null)
            },
          })
        }}
      />

      <ConfirmDialog
        open={confirmLogoutAll}
        onOpenChange={setConfirmLogoutAll}
        title="Log out of every device?"
        description="You and everyone else signed in to this account will need to sign in again."
        tone="destructive"
        confirmLabel="Log out everywhere"
        isConfirming={logoutAll.isPending}
        onConfirm={() => {
          logoutAll.mutate()
        }}
      />
    </SectionContainer>
  )
}

export default function AccountSecurityPage() {
  return (
    <PageContainer
      title="Account & Security"
      description="Manage your password and active sessions."
    >
      <ChangePasswordSection />
      <SessionsSection />
    </PageContainer>
  )
}
