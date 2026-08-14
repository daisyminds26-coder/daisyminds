import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Section } from '@/components/ui/Section'
import { Container } from '@/components/ui/Container'

interface ProgramsErrorBoundaryProps {
  children: ReactNode
  /**
   * Called on "Try again" — must cause the caller to build a *new* data
   * promise (e.g. bump a counter used as both a `useMemo` dependency and
   * the sibling `<Suspense key>`). A rejected promise is settled forever;
   * simply clearing `hasError` and re-rendering the same children would
   * `use()` the identical rejected promise and throw again immediately.
   */
  onRetry: () => void
}

interface ProgramsErrorBoundaryState {
  hasError: boolean
}

/**
 * `use()` throws when its promise rejects (a real network/server failure —
 * never the "not found" case, which `public-programs-service.ts` already
 * resolves to `undefined` instead of throwing), and Suspense requires an
 * error-boundary sibling to catch that throw — React has no hook
 * equivalent, so this is necessarily a class component. No such boundary
 * existed anywhere in this codebase before the dynamic-programs migration;
 * every page that fetches programs wraps its `<Suspense>` with this instead
 * of risking a blank page on API failure.
 */
export class ProgramsErrorBoundary extends Component<
  ProgramsErrorBoundaryProps,
  ProgramsErrorBoundaryState
> {
  state: ProgramsErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ProgramsErrorBoundaryState {
    return { hasError: true }
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false })
    this.props.onRetry()
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Section
          spacing="none"
          className="flex min-h-[50vh] flex-col items-center justify-center gap-4 pt-36 text-center"
        >
          <Container>
            <div className="mx-auto flex max-w-md flex-col items-center gap-4">
              <span className="bg-danger/10 text-danger flex size-12 items-center justify-center rounded-full">
                <AlertTriangle className="size-6" aria-hidden="true" />
              </span>
              <h2 className="font-display text-display-sm text-ink">
                We couldn't load this right now
              </h2>
              <p className="text-ink-muted text-body-sm">
                Something went wrong reaching our servers. Please try again in a moment.
              </p>
              <Button onClick={this.handleRetry} variant="ghost">
                Try again
              </Button>
            </div>
          </Container>
        </Section>
      )
    }

    return this.props.children
  }
}
