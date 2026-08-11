import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Loader2, ShieldAlert } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { useResendVerification, useVerifyEmail } from '@/features/auth/hooks/use-email-verification'

export default function VerifyEmailPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const token = searchParams.get('token')
  const verifyEmail = useVerifyEmail()
  const resendVerification = useResendVerification()
  const [resendEmail, setResendEmail] = useState('')
  const hasSubmitted = useRef(false)

  useEffect(() => {
    if (token && !hasSubmitted.current) {
      hasSubmitted.current = true
      verifyEmail.mutate(token)
      setSearchParams({}, { replace: true })
    }
  }, [token, setSearchParams, verifyEmail])

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="bg-destructive/10 flex size-14 items-center justify-center rounded-full">
          <ShieldAlert className="text-destructive size-7" />
        </div>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-h1 font-semibold">Verification link invalid</h1>
          <p className="text-body text-muted-foreground">
            This link is missing its verification token.
          </p>
        </div>
        <Button asChild className="mt-2 w-full">
          <Link to="/login">Back to sign in</Link>
        </Button>
      </div>
    )
  }

  if (verifyEmail.isPending || verifyEmail.isIdle) {
    return (
      <div className="flex flex-col items-center gap-4 text-center" role="status">
        <Loader2 className="text-muted-foreground size-8 animate-spin" />
        <p className="text-body text-muted-foreground">Verifying your email…</p>
      </div>
    )
  }

  if (verifyEmail.isSuccess) {
    return (
      <div className="flex flex-col items-center gap-4 text-center" role="status">
        <div className="bg-accent flex size-14 items-center justify-center rounded-full">
          <CheckCircle2 className="text-foreground size-7" />
        </div>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-h1 font-semibold">Email verified</h1>
          <p className="text-body text-muted-foreground">
            Your email address has been verified. You can now sign in.
          </p>
        </div>
        <Button asChild className="mt-2 w-full">
          <Link to="/login">Sign in</Link>
        </Button>
      </div>
    )
  }

  // The backend returns one generic 400 for an invalid, expired, or
  // already-used token (backend/src/services/auth.service.ts#verifyEmail) —
  // no distinction is invented here that the backend doesn't actually make.
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="bg-destructive/10 flex size-14 items-center justify-center rounded-full">
        <ShieldAlert className="text-destructive size-7" />
      </div>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-h1 font-semibold">This link is invalid or expired</h1>
        <p className="text-body text-muted-foreground">
          Verification links are only valid for a limited time and can only be used once.
        </p>
      </div>

      {resendVerification.isSuccess ? (
        <p className="text-success text-body-sm mt-2">
          If that email exists and is unverified, a new verification link has been sent.
        </p>
      ) : (
        <div className="mt-2 flex w-full flex-col gap-2 text-left">
          <Label htmlFor="resend-email">Resend verification email</Label>
          <div className="flex gap-2">
            <Input
              id="resend-email"
              type="email"
              placeholder="you@example.com"
              value={resendEmail}
              onChange={(event) => {
                setResendEmail(event.target.value)
              }}
              disabled={resendVerification.isPending}
            />
            <Button
              type="button"
              variant="outline"
              disabled={resendVerification.isPending || !resendEmail}
              onClick={() => {
                resendVerification.mutate(resendEmail)
              }}
            >
              Resend
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
