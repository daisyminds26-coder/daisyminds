import logoMarkSrc from '@/shared/assets/daisy-minds-logo-mark.png'
import logoLockupSrc from '@/shared/assets/daisy-minds-logo-lockup.png'

import { cn } from '@/shared/lib/utils'

/**
 * The flower mark alone — used where there's no room for the wordmark (a
 * collapsed sidebar, a tight touch target). Everywhere else, render
 * `<Logo>` instead. Mirrors the public website's own `Logo`/`LogoMark`
 * pair (`website/src/components/ui/Logo.tsx`) so the brand mark is
 * identical across both apps.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src={logoMarkSrc}
      alt=""
      width={500}
      height={577}
      className={cn('block h-8 w-auto object-contain', className)}
    />
  )
}

/**
 * The full Daisy Minds logo — flower mark + "Daisy Minds" wordmark + the
 * "Elevating to Boom" tagline, exactly as designed, as one lockup image.
 * This is "the logo": callers render this and never print a separate
 * "Daisy Minds" text label next to it.
 *
 * `alt` defaults to `''` (decorative — the norm, since a surrounding
 * `<Link aria-label>` usually already names the destination). Pass a real
 * string only where this image is itself the sole accessible name for
 * something — e.g. a dialog/sheet title that has no other text content.
 */
export function Logo({ className, alt = '' }: { className?: string; alt?: string }) {
  return (
    <img
      src={logoLockupSrc}
      alt={alt}
      width={1872}
      height={577}
      className={cn('block h-8 w-auto object-contain', className)}
    />
  )
}
