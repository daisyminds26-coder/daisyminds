import { Link } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { ArrowLeft, MailCheck } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Form } from '@/shared/components/ui/form'
import { Alert, AlertDescription } from '@/shared/components/ui/alert'
import { TextField } from '@/shared/components/forms/text-field'
import { useForgotPassword } from '@/features/auth/hooks/use-password'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from '@/features/auth/schemas/auth.schemas'

export default function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword()

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  function onSubmit(values: ForgotPasswordFormValues) {
    forgotPassword.mutate(values.email)
  }

  if (forgotPassword.isSuccess) {
    return (
      <div className="flex flex-col items-center gap-4 text-center" role="status">
        <div className="bg-accent flex size-14 items-center justify-center rounded-full">
          <MailCheck className="text-foreground size-7" />
        </div>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-h1 font-semibold">Check your email</h1>
          <p className="text-body text-muted-foreground">
            If an account exists for that email, we've sent a link to reset your password.
          </p>
        </div>
        <Button asChild variant="outline" className="mt-2 w-full">
          <Link to="/login">Back to sign in</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-h1 font-semibold">Forgot your password?</h1>
        <p className="text-body text-muted-foreground">
          Enter your email and we'll send you a link to reset it.
        </p>
      </div>

      {forgotPassword.isError && (
        <Alert variant="destructive">
          <AlertDescription>{getSafeErrorMessage(forgotPassword.error)}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form
          onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
          className="flex flex-col gap-4"
          noValidate
        >
          <TextField
            control={form.control}
            name="email"
            label="Email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            disabled={forgotPassword.isPending}
          />
          <Button type="submit" className="w-full" disabled={forgotPassword.isPending}>
            {forgotPassword.isPending ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      </Form>

      <Link
        to="/login"
        className="text-body-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5"
      >
        <ArrowLeft className="size-3.5" />
        Back to sign in
      </Link>
    </div>
  )
}
