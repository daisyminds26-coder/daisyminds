import { RouterProvider } from 'react-router-dom'

import { router } from '@/app/router'
import { useAuthBootstrap } from '@/features/auth/hooks/use-auth-bootstrap'
import { useAuthTabSync } from '@/features/auth/hooks/use-auth-tab-sync'
import { ErrorBoundary } from '@/shared/components/feedback/error-boundary'

function App() {
  useAuthBootstrap()
  useAuthTabSync()

  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  )
}

export default App
