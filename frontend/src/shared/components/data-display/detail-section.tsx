import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'

/** Labeled group of `DetailField`s inside a detail drawer's Overview-style tab — pairs with a `<Separator />` between sections. */
export function DetailSection({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <h4 className="text-caption text-muted-foreground font-semibold tracking-wide uppercase">
        {title}
      </h4>
      {children}
    </div>
  )
}

/** Single icon + label + value pair — use inside a `<dl className="grid grid-cols-2 gap-4">`. */
export function DetailField({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon?: LucideIcon
  label: string
  value: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <dt className="text-caption text-muted-foreground flex items-center gap-1.5">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </dt>
      <dd className="text-body-sm">{value}</dd>
    </div>
  )
}
