import type { ContentStatus, ILesson, LessonType } from '../models/lesson.model'

/** No content model exists yet for these lesson types (deferred to their own future phases). */
const UNCONFIGURED_LESSON_TYPES: readonly LessonType[] = ['LIVE_CLASS', 'QUIZ', 'ASSIGNMENT']

type ContentFields = Pick<
  ILesson,
  'lessonType' | 'textContent' | 'videoAsset' | 'documentAsset' | 'externalLink'
>

/** Strips tags to check for genuinely blank rich-text (e.g. a lone `<p></p>` from an editor the admin never typed into). */
function isBlankHtml(html: string): boolean {
  return html.replace(/<[^>]*>/g, '').trim().length === 0
}

/**
 * Always server-computed, never accepted from the client (SECURITY.md).
 * Exactly one of the four content fields is meaningful per lesson, selected
 * by `lessonType` — the others are expected to be `null` and are ignored
 * even if somehow populated, so a stale field from a prior lesson type can
 * never leak into the computed status.
 */
export function computeContentStatus(lesson: ContentFields): ContentStatus {
  if (UNCONFIGURED_LESSON_TYPES.includes(lesson.lessonType)) {
    return 'NOT_CONFIGURED'
  }

  switch (lesson.lessonType) {
    case 'TEXT': {
      if (!lesson.textContent) return 'EMPTY'
      return isBlankHtml(lesson.textContent) ? 'INCOMPLETE' : 'READY'
    }
    case 'VIDEO': {
      if (!lesson.videoAsset) return 'EMPTY'
      switch (lesson.videoAsset.status) {
        case 'READY':
          return 'READY'
        case 'FAILED':
          return 'ERROR'
        default:
          return 'PROCESSING'
      }
    }
    case 'DOCUMENT':
      return lesson.documentAsset ? 'READY' : 'EMPTY'
    case 'EXTERNAL_LINK':
      return lesson.externalLink?.url ? 'READY' : 'EMPTY'
    default:
      return 'NOT_CONFIGURED'
  }
}

/** A lesson has *any* content for its previous type — used to gate the lesson-type-change confirmation guard (ARCHITECTURE.md §21). */
export function hasExistingContent(lesson: ContentFields): boolean {
  return (
    lesson.textContent !== null ||
    lesson.videoAsset !== null ||
    lesson.documentAsset !== null ||
    lesson.externalLink !== null
  )
}
