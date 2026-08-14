import { cn } from '@/shared/lib/utils'

interface LessonTextContentProps {
  html: string
  className?: string
}

/**
 * Renders the lesson's `textContent` — sanitized server-side at write time
 * (Phase 9C, `sanitize-html`) before it's ever persisted; this is a direct
 * render of already-trusted content, not a second client-side sanitization
 * pass (SECURITY.md's boundary is the write path, not every read).
 * `@tailwindcss/typography` isn't a dependency here, so headings/lists/
 * code/etc. get a compact hand-written set of child-selector styles
 * instead of pulling in a plugin for one read-only view.
 */
export function LessonTextContent({ html, className }: LessonTextContentProps) {
  return (
    <div
      className={cn(
        'text-body max-w-prose leading-relaxed',
        '[&_h1]:text-h1 [&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:font-semibold',
        '[&_h2]:text-h2 [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:font-semibold',
        '[&_h3]:text-h3 [&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:font-semibold',
        '[&_p]:mb-4',
        '[&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6',
        '[&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6',
        '[&_li]:mb-1',
        '[&_blockquote]:border-border [&_blockquote]:text-muted-foreground [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:italic',
        '[&_code]:bg-muted [&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm',
        '[&_pre]:bg-muted [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:p-4',
        '[&_table]:my-4 [&_table]:w-full [&_table]:border-collapse',
        '[&_th]:border-border [&_th]:border [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold',
        '[&_td]:border-border [&_td]:border [&_td]:px-3 [&_td]:py-2',
        '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2',
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
