import logoMarkSrc from '@/app/assets/daisy-minds-logo-mark.png'
import logoLockupSrc from '@/app/assets/daisy-minds-logo-lockup.png'

import { cn } from '@/utils/cn'

/**
 * The flower mark alone, cropped from the real brand artwork — used where
 * there's no room for the wordmark (the favicon, a tight touch target).
 * Everywhere else, render `<Logo>` instead.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src={logoMarkSrc}
      alt=""
      width={500}
      height={577}
      className={cn('block h-11 w-auto object-contain', className)}
    />
  )
}

/**
 * The full Daisy Minds logo — flower mark + "Daisy Minds" wordmark, exactly
 * as designed, as one lockup image. This is "the logo": callers render this
 * and never print a separate "Daisy Minds" text label next to it.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <img
      src={logoLockupSrc}
      alt=""
      width={1872}
      height={577}
      className={cn('block h-11 w-auto object-contain', className)}
    />
  )
}
