import type { ElementType, ReactNode } from 'react'

import { cn } from '@/utils/cn'

interface ContainerProps {
  children: ReactNode
  className?: string
  as?: ElementType
  /** Narrower measure for reading-heavy content (FAQ, article-like copy). */
  size?: 'default' | 'narrow'
}

export function Container({
  children,
  className,
  as: Tag = 'div',
  size = 'default',
}: ContainerProps) {
  return (
    <Tag
      className={cn(
        'mx-auto w-full px-5 sm:px-8 lg:px-12',
        size === 'default' ? 'max-w-7xl' : 'max-w-3xl',
        className,
      )}
    >
      {children}
    </Tag>
  )
}
