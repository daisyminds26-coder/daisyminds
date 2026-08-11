import sanitizeHtml from 'sanitize-html'

/**
 * Allowlist for TEXT lesson content, authored via the admin rich-text editor
 * (Tiptap) and rendered as-is later by the (future) Learning Player — this
 * is the only place lesson body HTML is trusted to reach a browser, so the
 * allowlist is deliberately narrow. Frontend sanitization is never trusted;
 * this is the single point every text-lesson write passes through
 * (SECURITY.md §Content Sanitization).
 *
 * Explicitly excluded: `script`, `style`, `iframe`, `object`, `embed`, `form`,
 * event-handler attributes (`onclick` etc.), `javascript:`/`data:` URLs, and
 * inline `style` attributes — sanitize-html strips unknown tags/attributes
 * by default, but the allowlist below is spelled out so the permitted
 * surface is auditable at a glance.
 */
const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'strike',
  'h1',
  'h2',
  'h3',
  'h4',
  'ul',
  'ol',
  'li',
  'a',
  'code',
  'pre',
  'blockquote',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
]

const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ['href', 'target', 'rel'],
}

const ALLOWED_SCHEMES = ['http', 'https', 'mailto']

export function sanitizeLessonHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ALLOWED_SCHEMES,
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer nofollow' }),
    },
  })
}
