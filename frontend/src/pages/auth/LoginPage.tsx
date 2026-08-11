import { Link, useLocation, useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { Button } from '@/shared/components/ui/button'
import { Form } from '@/shared/components/ui/form'
import { Alert, AlertDescription } from '@/shared/components/ui/alert'
import { TextField } from '@/shared/components/forms/text-field'
import { AccountStatusAlert } from '@/features/auth/components/AccountStatusAlert'
import { PasswordField } from '@/features/auth/components/PasswordField'
import { useLogin } from '@/features/auth/hooks/use-login'
import { resolvePostLoginPath } from '@/features/auth/utils/redirect'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { isApiClientError } from '@/shared/lib/api-error'
import { loginSchema, type LoginFormValues } from '@/features/auth/schemas/auth.schemas'

const ACCOUNT_STATUS_CODES = new Set(['EMAIL_NOT_VERIFIED', 'ACCOUNT_LOCKED', 'FORBIDDEN'])

interface LocationState {
  from?: { pathname: string }
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const loginMutation = useLogin()

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  function onSubmit(values: LoginFormValues) {
    loginMutation.mutate(values, {
      onSuccess: (result) => {
        const intendedPath = (location.state as LocationState | null)?.from?.pathname
        void navigate(resolvePostLoginPath(result.user.role, intendedPath), { replace: true })
      },
    })
  }

  const error = loginMutation.error
  const isAccountStatusError =
    error && isApiClientError(error) && ACCOUNT_STATUS_CODES.has(error.code)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-h1 font-semibold">Welcome back</h1>
        <p className="text-body text-muted-foreground">Sign in to your Daisy Minds account</p>
      </div>

      {error &&
        (isAccountStatusError && isApiClientError(error) ? (
          <AccountStatusAlert
            code={error.code}
            message={error.message}
            email={form.getValues('email')}
            details={error.details}
          />
        ) : (
          <Alert variant="destructive">
            <AlertDescription>{getSafeErrorMessage(error)}</AlertDescription>
          </Alert>
        ))}

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
            disabled={loginMutation.isPending}
          />
          <div className="flex flex-col gap-1.5">
            <PasswordField
              control={form.control}
              name="password"
              label="Password"
              autoComplete="current-password"
              disabled={loginMutation.isPending}
            />
            <Link
              to="/forgot-password"
              className="text-body-sm text-muted-foreground hover:text-foreground self-end"
            >
              Forgot password?
            </Link>
          </div>
          <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </Form>
    </div>
  )
}
