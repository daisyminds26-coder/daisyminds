import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'

import { ThemeProvider } from '@/app/theme/theme-provider'
import { queryClient } from '@/shared/lib/query-client'
import { Toaster } from '@/shared/components/ui/sonner'
import { TooltipProvider } from '@/shared/components/ui/tooltip'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={200}>
          {children}
          <Toaster position="top-right" />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
