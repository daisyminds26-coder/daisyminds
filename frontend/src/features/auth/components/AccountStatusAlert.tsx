import { useState } from 'react'
import { format } from 'date-fns'
import { Lock, MailWarning, ShieldOff } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'
import { useResendVerification } from '@/features/auth/hooks/use-email-verification'

interface AccountStatusAlertProps {
  code: string
  message: string
  email: string
  details?: Record<string, unknown>
}

/**
 * Inline account-status states shown on the Login page in response to a
 * failed login attempt (`EMAIL_NOT_VERIFIED`, `ACCOUNT_LOCKED`, `FORBIDDEN`
 * i.e. suspended) — there is no independent URL for these, they only ever
 * arise as a login response. `Alert`'s `role="alert"` gives this a live
 * region for free.
 */
export function AccountStatusAlert({ code, message, email, details }: AccountStatusAlertProps) {
  const resendVerification = useResendVerification()
  const [resent, setResent] = useState(false)

  if (code === 'EMAIL_NOT_VERIFIED') {
    return (
      <Alert>
        <MailWarning />
        <AlertTitle>Verify your email to continue</AlertTitle>
        <AlertDescription>
          <p>{message}</p>
          {resent ? (
            <p className="text-success mt-2">
              If that email exists and is unverified, a new verification link has been sent.
            </p>
          ) : (
            <Button
              type="button"
              variant="link"
              className="mt-1 h-auto p-0"
              disabled={resendVerification.isPending}
              onClick={() => {
                resendVerification.mutate(email)
                setResent(true)
              }}
            >
              Resend verification email
            </Button>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  if (code === 'ACCOUNT_LOCKED') {
    const lockedUntilRaw = details?.lockedUntil
    const lockedUntil = typeof lockedUntilRaw === 'string' ? new Date(lockedUntilRaw) : null

    return (
      <Alert variant="destructive">
        <Lock />
        <AlertTitle>Account temporarily locked</AlertTitle>
        <AlertDescription>
          <p>{message}</p>
          {lockedUntil && (
            <p className="mt-1">You can try again after {format(lockedUntil, 'h:mm a')}.</p>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  if (code === 'FORBIDDEN') {
    const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL

    return (
      <Alert variant="destructive">
        <ShieldOff />
        <AlertTitle>Account suspended</AlertTitle>
        <AlertDescription>
          <p>{message}</p>
          {supportEmail && (
            <p className="mt-1">
              Contact{' '}
              <a href={`mailto:${supportEmail}`} className="underline">
                {supportEmail}
              </a>{' '}
              for help.
            </p>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}
