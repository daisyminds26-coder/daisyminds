import { Link, Outlet } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'

/**
 * Layout for public auth pages (login, forgot/reset password). Split panel
 * on desktop — brand/value-prop on the left, form on the right — collapses
 * to a single centered column on tablet/mobile.
 */
export function AuthLayout() {
  return (
    <div className="bg-background grid min-h-svh lg:grid-cols-2">
      <div className="bg-primary/10 relative hidden flex-col justify-between p-10 lg:flex">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-md text-sm font-bold">
            DM
          </span>
          <span className="text-h3 font-semibold">Daisy Minds</span>
        </Link>

        <div className="flex max-w-md flex-col gap-4">
          <GraduationCap className="text-foreground size-10" />
          <p className="text-h1 font-semibold text-balance">
            One platform for learning, teaching, and running your institution.
          </p>
          <p className="text-body text-muted-foreground">
            Manage courses, batches, attendance, assessments, and certifications — all in one place.
          </p>
        </div>

        <p className="text-caption text-muted-foreground">
          © {new Date().getFullYear()} Daisy Minds LMS
        </p>
      </div>

      <div className="flex flex-col items-center justify-center p-6 sm:p-10">
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-md text-sm font-bold">
            DM
          </span>
          <span className="text-h3 font-semibold">Daisy Minds</span>
        </div>
        <div className="w-full max-w-sm">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
