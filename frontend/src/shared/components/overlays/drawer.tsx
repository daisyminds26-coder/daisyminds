import type { ReactNode } from 'react'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/shared/components/ui/sheet'

interface DrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  side?: 'left' | 'right' | 'top' | 'bottom'
  footer?: ReactNode
  children: ReactNode
  className?: string
}

/** Generic side-panel overlay for detail views (e.g. "view student" panel) — distinct from `MobileNavDrawer`, which is nav-specific. */
export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  side = 'right',
  footer,
  children,
  className,
}: DrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side} className={className}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4">{children}</div>
        {footer && <SheetFooter>{footer}</SheetFooter>}
      </SheetContent>
    </Sheet>
  )
}
