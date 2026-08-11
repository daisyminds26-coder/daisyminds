import { Loader2 } from 'lucide-react'

import { cn } from '@/shared/lib/utils'

interface LoadingSpinnerProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses: Record<NonNullable<LoadingSpinnerProps['size']>, string> = {
  sm: 'size-4',
  md: 'size-6',
  lg: 'size-8',
}

export function LoadingSpinner({ className, size = 'md' }: LoadingSpinnerProps) {
  return (
    <Loader2
      role="status"
      aria-label="Loading"
      className={cn('text-muted-foreground animate-spin', sizeClasses[size], className)}
    />
  )
}
