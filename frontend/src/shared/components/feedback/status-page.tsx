import type { ComponentType, ReactNode } from 'react'

interface StatusPageProps {
  icon: ComponentType<{ className?: string }>
  code?: string
  title: string
  description: string
  action?: ReactNode
}

/** Full-page status shell shared by the 404/403/500/maintenance pages. */
export function StatusPage({ icon: Icon, code, title, description, action }: StatusPageProps) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="bg-accent flex size-16 items-center justify-center rounded-full">
        <Icon className="text-foreground size-8" />
      </div>
      <div className="flex flex-col gap-2">
        {code && (
          <p className="text-caption text-muted-foreground font-semibold tracking-widest">{code}</p>
        )}
        <h1 className="text-h1 font-semibold">{title}</h1>
        <p className="text-body text-muted-foreground max-w-md">{description}</p>
      </div>
      {action}
    </div>
  )
}
