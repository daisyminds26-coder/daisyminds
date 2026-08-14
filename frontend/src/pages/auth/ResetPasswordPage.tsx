import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { CheckCircle2, ShieldAlert } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Form } from '@/shared/components/ui/form'
import { PasswordField } from '@/features/auth/components/PasswordField'
import { useResetPassword } from '@/features/auth/hooks/use-password'
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from '@/features/auth/schemas/auth.schemas'

export default function ResetPasswordPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const token = searchParams.get('token')
  const resetPassword = useResetPassword()
  const hasStrippedToken = useRef(false)

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  })

  // Strip the token out of the URL/history the moment we've captured it —
  // it's held only in local component state (`token`) from here on.
  useEffect(() => {
    if (token && !hasStrippedToken.current) {
      hasStrippedToken.current = true
      setSearchParams({}, { replace: true })
    }
  }, [token, setSearchParams])

  function onSubmit(values: ResetPasswordFormValues) {
    if (!token) return
    resetPassword.mutate({ token, newPassword: values.newPassword })
  }

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="bg-destructive/10 flex size-14 items-center justify-center rounded-full">
          <ShieldAlert className="text-destructive size-7" />
        </div>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-h1 font-semibold">Reset link invalid</h1>
          <p className="text-body text-muted-foreground">
            This password reset link is missing its token. Request a new one below.
          </p>
        </div>
        <Button asChild className="mt-2 w-full">
          <Link to="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    )
  }

  if (resetPassword.isSuccess) {
    return (
      <div className="flex flex-col items-center gap-4 text-center" role="status">
        <div className="bg-accent flex size-14 items-center justify-center rounded-full">
          <CheckCircle2 className="text-foreground size-7" />
        </div>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-h1 font-semibold">Password reset</h1>
          <p className="text-body text-muted-foreground">
            Your password has been changed. You can now sign in with your new password.
          </p>
        </div>
        <Button asChild className="mt-2 w-full">
          <Link to="/login">Sign in</Link>
        </Button>
      </div>
    )
  }

  // The backend returns one generic 400 for an invalid, expired, or
  // already-used token — it deliberately doesn't distinguish these
  // (backend/src/services/auth.service.ts#resetPassword), so the frontend
  // doesn't invent a distinction it can't actually make.
  if (resetPassword.isError) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="bg-destructive/10 flex size-14 items-center justify-center rounded-full">
          <ShieldAlert className="text-destructive size-7" />
        </div>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-h1 font-semibold">This link is invalid or expired</h1>
          <p className="text-body text-muted-foreground">
            Password reset links are only valid for a limited time and can only be used once.
          </p>
        </div>
        <Button asChild className="mt-2 w-full">
          <Link to="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-h1 font-semibold">Set a new password</h1>
        <p className="text-body text-muted-foreground">
          Choose a strong password with at least 10 characters.
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
          className="flex flex-col gap-4"
          noValidate
        >
          <PasswordField
            control={form.control}
            name="newPassword"
            label="New password"
            autoComplete="new-password"
            disabled={resetPassword.isPending}
            description="At least 10 characters, including a letter and a number."
          />
          <PasswordField
            control={form.control}
            name="confirmPassword"
            label="Confirm new password"
            autoComplete="new-password"
            disabled={resetPassword.isPending}
          />
          <Button type="submit" className="w-full" disabled={resetPassword.isPending}>
            {resetPassword.isPending ? 'Resetting…' : 'Reset password'}
          </Button>
        </form>
      </Form>

      <Link
        to="/login"
        className="text-body-sm text-muted-foreground hover:text-foreground text-center"
      >
        Back to sign in
      </Link>
    </div>
  )
}
