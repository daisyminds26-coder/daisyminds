import { LogoMark } from '@/components/ui/Logo'
import { cn } from '@/utils/cn'

/**
 * Shown in place of a program's `thumbnailUrl`/`bannerUrl` when a course
 * has no verified public image yet — one tasteful branded placeholder
 * (the real flower mark on a brand-tinted background), not a fake stock
 * photo standing in as if it were real program photography.
 */
export function ProgramImageFallback({
  aspectRatio = '4/3',
  className,
}: {
  aspectRatio?: string
  className?: string
}) {
  return (
    <div
      style={{ aspectRatio }}
      className={cn('bg-primary-soft flex w-full items-center justify-center', className)}
    >
      <LogoMark className="h-12 w-auto opacity-60" />
    </div>
  )
}
