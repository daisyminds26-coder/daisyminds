import { LoadingSpinner } from '@/shared/components/feedback/loading-spinner'

/** Suspense fallback for lazy-loaded routes (App-Standards: code splitting). */
export function PageLoader() {
  return (
    <div className="flex min-h-[50vh] w-full items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  )
}
