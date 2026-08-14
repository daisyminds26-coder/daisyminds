import { type SubmitEvent, useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'

import { TextField } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { login, registerApplicant, AuthApiError } from '@/services/auth-service'

export interface Applicant {
  name: string
  email: string
  /** `login` used a real, verified backend session; `register-pending` used the honest placeholder (see `services/auth-service.ts`) — no backend account exists yet. */
  method: 'login' | 'register-pending'
}

interface AccountStepProps {
  onAuthenticated: (applicant: Applicant) => void
  onBack: () => void
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^[0-9+\-\s()]{7,15}$/

/** Step 3 — Login calls the real LMS backend directly. Register is an honest, clearly-labeled placeholder (no self-registration endpoint exists yet — see README's "Authentication Handoff" section); it never claims an account was actually created. */
export function AccountStep({ onAuthenticated, onBack }: AccountStepProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | undefined>(undefined)

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  function handleLoginSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(undefined)

    if (!EMAIL_PATTERN.test(loginEmail.trim())) {
      setFieldErrors({ loginEmail: 'Enter a valid email address' })
      return
    }
    if (loginPassword.length === 0) {
      setFieldErrors({ loginPassword: 'Enter your password' })
      return
    }
    setFieldErrors({})
    setIsSubmitting(true)
    login(loginEmail.trim(), loginPassword)
      .then((result) => {
        onAuthenticated({ name: result.user.email, email: result.user.email, method: 'login' })
      })
      .catch((error: unknown) => {
        setFormError(
          error instanceof AuthApiError ? error.message : 'Unable to sign in. Please try again.',
        )
      })
      .finally(() => {
        setIsSubmitting(false)
      })
  }

  function handleRegisterSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(undefined)

    const errors: Record<string, string> = {}
    if (firstName.trim().length < 2) errors.firstName = 'Enter your first name'
    if (lastName.trim().length < 2) errors.lastName = 'Enter your last name'
    if (!EMAIL_PATTERN.test(registerEmail.trim()))
      errors.registerEmail = 'Enter a valid email address'
    if (!PHONE_PATTERN.test(phone.trim())) errors.phone = 'Enter a valid phone number'
    if (password.length < 8) errors.password = 'Use at least 8 characters'
    if (confirmPassword !== password) errors.confirmPassword = 'Passwords do not match'

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})
    setIsSubmitting(true)
    registerApplicant({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: registerEmail.trim(),
      phone: phone.trim(),
      password,
    })
      .then(() => {
        onAuthenticated({
          name: `${firstName.trim()} ${lastName.trim()}`,
          email: registerEmail.trim(),
          method: 'register-pending',
        })
      })
      .catch(() => {
        setFormError('Unable to save your details right now. Please try again.')
      })
      .finally(() => {
        setIsSubmitting(false)
      })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-display-sm text-ink">Your Account</h2>
        <p className="text-ink-muted text-body-sm mt-1">
          {mode === 'login'
            ? 'Sign in to continue your application.'
            : 'Create an account to continue your application.'}
        </p>
      </div>

      {mode === 'login' ? (
        <form onSubmit={handleLoginSubmit} noValidate className="flex flex-col gap-4">
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={loginEmail}
            onChange={(event) => {
              setLoginEmail(event.target.value)
            }}
            error={fieldErrors.loginEmail}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={loginPassword}
            onChange={(event) => {
              setLoginPassword(event.target.value)
            }}
            error={fieldErrors.loginPassword}
          />
          {formError && (
            <p role="alert" className="text-destructive text-sm">
              {formError}
            </p>
          )}
          <div className="flex items-center gap-3">
            <Button
              onClick={onBack}
              type="button"
              variant="ghost"
              size="lg"
              icon={<ArrowLeft className="size-4.5" />}
            >
              Back
            </Button>
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              trailingIcon={<ArrowRight className="size-4.5" />}
            >
              {isSubmitting ? 'Signing in…' : 'Login & Continue'}
            </Button>
          </div>
          <button
            type="button"
            onClick={() => {
              setMode('register')
              setFormError(undefined)
            }}
            className="text-primary-dark w-fit text-sm font-semibold hover:underline"
          >
            New here? Create an account
          </button>
        </form>
      ) : (
        <form onSubmit={handleRegisterSubmit} noValidate className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="First name"
              autoComplete="given-name"
              required
              value={firstName}
              onChange={(event) => {
                setFirstName(event.target.value)
              }}
              error={fieldErrors.firstName}
            />
            <TextField
              label="Last name"
              autoComplete="family-name"
              required
              value={lastName}
              onChange={(event) => {
                setLastName(event.target.value)
              }}
              error={fieldErrors.lastName}
            />
          </div>
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={registerEmail}
            onChange={(event) => {
              setRegisterEmail(event.target.value)
            }}
            error={fieldErrors.registerEmail}
          />
          <TextField
            label="Phone"
            type="tel"
            autoComplete="tel"
            required
            value={phone}
            onChange={(event) => {
              setPhone(event.target.value)
            }}
            error={fieldErrors.phone}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="Password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
              }}
              error={fieldErrors.password}
            />
            <TextField
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value)
              }}
              error={fieldErrors.confirmPassword}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={onBack}
              type="button"
              variant="ghost"
              size="lg"
              icon={<ArrowLeft className="size-4.5" />}
            >
              Back
            </Button>
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              trailingIcon={<ArrowRight className="size-4.5" />}
            >
              {isSubmitting ? 'Creating account…' : 'Register & Continue'}
            </Button>
          </div>
          <button
            type="button"
            onClick={() => {
              setMode('login')
              setFormError(undefined)
            }}
            className="text-primary-dark w-fit text-sm font-semibold hover:underline"
          >
            Already have an account? Login
          </button>
        </form>
      )}
    </div>
  )
}
