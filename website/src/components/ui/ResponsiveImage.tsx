import { cn } from '@/utils/cn'

interface ResponsiveImageProps {
  src: string
  alt: string
  /** Sets the intrinsic box before the image loads, preventing layout shift. Defaults to `16/9`. */
  aspectRatio?: string
  sizes?: string
  /** Marks this as the LCP candidate — skips lazy-loading and sets `fetchpriority="high"`. Use for exactly one above-the-fold image per page. */
  priority?: boolean
  className?: string
  objectFit?: 'cover' | 'contain'
}

/**
 * The one place image-loading behavior is decided site-wide: explicit
 * aspect-ratio (no CLS), lazy-loading below the fold, eager+high-priority
 * for the current page's LCP image, and consistent `object-fit`. Every
 * photographic image in the site renders through this, never a bare `<img>`.
 */
export function ResponsiveImage({
  src,
  alt,
  aspectRatio = '16/9',
  sizes = '100vw',
  priority = false,
  className,
  objectFit = 'cover',
}: ResponsiveImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      sizes={sizes}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchPriority={priority ? 'high' : 'auto'}
      style={{ aspectRatio }}
      className={cn(
        'block w-full',
        objectFit === 'cover' ? 'object-cover' : 'object-contain',
        className,
      )}
    />
  )
}
