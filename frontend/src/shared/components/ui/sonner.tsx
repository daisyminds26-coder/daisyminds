'use client'

import { Toaster as Sonner, type ToasterProps } from 'sonner'
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from 'lucide-react'

// Theme is hardcoded to "light" — this app has a single locked theme
// (app/theme/theme-provider.tsx), not next-themes, which the upstream
// shadcn registry component assumes.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="text-success size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="text-warning size-4" />,
        error: <OctagonXIcon className="text-destructive size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
          '--success-bg': 'color-mix(in oklch, var(--success) 12%, var(--popover))',
          '--success-text': 'var(--popover-foreground)',
          '--success-border': 'var(--success)',
          '--error-bg': 'color-mix(in oklch, var(--destructive) 12%, var(--popover))',
          '--error-text': 'var(--popover-foreground)',
          '--error-border': 'var(--destructive)',
          '--warning-bg': 'color-mix(in oklch, var(--warning) 15%, var(--popover))',
          '--warning-text': 'var(--popover-foreground)',
          '--warning-border': 'var(--warning)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'cn-toast',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
