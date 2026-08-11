import { useState } from 'react'

import { Drawer } from '@/shared/components/overlays/drawer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Button } from '@/shared/components/ui/button'
import { useCurrentUser } from '@/features/auth/hooks/use-current-user'
import {
  useTriggerPasswordReset,
  useResendVerification,
} from '@/features/users/hooks/use-user-credentials'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { toast } from '@/shared/lib/toast'
import { RoleBadge } from '@/features/users/components/RoleBadge'
import { UserStatusBadge } from '@/features/users/components/UserStatusBadge'
import { UserSessionsPanel } from '@/features/users/components/UserSessionsPanel'
import { UserAuditTimeline } from '@/features/users/components/UserAuditTimeline'
import type { AdminUser } from '@/features/users/types'

interface UserDetailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: AdminUser | undefined
}

export function UserDetailDrawer({ open, onOpenChange, user }: UserDetailDrawerProps) {
  const { data: currentUser } = useCurrentUser()
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN'
  const [auditPage, setAuditPage] = useState(1)
  const resetPassword = useTriggerPasswordReset()
  const resendVerification = useResendVerification()

  if (!user) return null

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title={user.email} className="sm:max-w-lg">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <RoleBadge role={user.role} />
          <UserStatusBadge status={user.status} />
          {user.isDeleted && (
            <span className="text-caption text-destructive font-medium">Deleted</span>
          )}
        </div>

        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            {isSuperAdmin && <TabsTrigger value="sessions">Sessions</TabsTrigger>}
            {isSuperAdmin && <TabsTrigger value="activity">Activity</TabsTrigger>}
          </TabsList>

          <TabsContent value="details" className="flex flex-col gap-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-caption text-muted-foreground">Email verified</dt>
                <dd className="text-body-sm">{user.emailVerifiedAt ? 'Yes' : 'No'}</dd>
              </div>
              <div>
                <dt className="text-caption text-muted-foreground">MFA enabled</dt>
                <dd className="text-body-sm">{user.mfaEnabled ? 'Yes' : 'No'}</dd>
              </div>
              <div>
                <dt className="text-caption text-muted-foreground">Last login</dt>
                <dd className="text-body-sm">{user.lastLoginAt ?? 'Never'}</dd>
              </div>
              <div>
                <dt className="text-caption text-muted-foreground">Last login IP</dt>
                <dd className="text-body-sm">{user.lastLoginIp ?? '—'}</dd>
              </div>
            </dl>

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={resetPassword.isPending}
                onClick={() => {
                  resetPassword.mutate(user.id, {
                    onSuccess: () => toast.success('Password reset email sent'),
                    onError: (error) =>
                      toast.error('Could not send reset email', getSafeErrorMessage(error)),
                  })
                }}
              >
                Send password reset email
              </Button>
              {user.status === 'PENDING_VERIFICATION' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={resendVerification.isPending}
                  onClick={() => {
                    resendVerification.mutate(user.id, {
                      onSuccess: () => toast.success('Verification email sent'),
                      onError: (error) =>
                        toast.error(
                          'Could not send verification email',
                          getSafeErrorMessage(error),
                        ),
                    })
                  }}
                >
                  Resend verification email
                </Button>
              )}
            </div>
          </TabsContent>

          {isSuperAdmin && (
            <TabsContent value="sessions">
              <UserSessionsPanel userId={user.id} email={user.email} />
            </TabsContent>
          )}

          {isSuperAdmin && (
            <TabsContent value="activity">
              <UserAuditTimeline userId={user.id} page={auditPage} onPageChange={setAuditPage} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Drawer>
  )
}
