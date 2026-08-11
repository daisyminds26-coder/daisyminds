import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertOctagon } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Top-level render-error boundary. React error boundaries must be class
 * components (no hook equivalent) — this catches errors that escape
 * TanStack Query/route-level error handling, e.g. bugs in render logic
 * itself, so a broken subtree never blanks the whole app.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Unhandled render error', error, errorInfo)
  }

  private handleReload = (): void => {
    window.location.reload()
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="bg-destructive/10 flex size-14 items-center justify-center rounded-full">
            <AlertOctagon className="text-destructive size-7" />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-h2 font-semibold">Something went wrong</h1>
            <p className="text-body-sm text-muted-foreground max-w-sm">
              An unexpected error occurred. Reloading the page usually fixes this.
            </p>
          </div>
          <Button onClick={this.handleReload}>Reload page</Button>
        </div>
      )
    }

    return this.props.children
  }
}
