import { useEffect, useRef } from 'react'

import { ErrorState } from '@/shared/components/feedback/error-state'
import { LoadingSpinner } from '@/shared/components/feedback/loading-spinner'
import { LessonResourcesList } from '@/features/learning-player/components/LessonResourcesList'
import { useLessonMediaUrl } from '@/features/learning-player/hooks/use-lesson-media-url'
import { useUpdateLessonProgress } from '@/features/learning-player/hooks/use-update-lesson-progress'
import type { LessonDetail } from '@/features/learning-player/types'

const HEARTBEAT_INTERVAL_MS = 12_000

interface VideoLessonPlayerProps {
  lesson: LessonDetail
}

/**
 * A plain HTML5 `<video>` with native controls — deliberately not a video-
 * library dependency (task's own instruction: no DRM, no big player
 * library unless genuinely required; native controls already cover play/
 * pause/seek/volume/fullscreen/rate accessibly). Position is reported to
 * the server on a ~12s throttle while playing, plus on pause/seek/unmount
 * — never on every `timeupdate` tick, never relying solely on
 * `beforeunload`.
 */
export function VideoLessonPlayer({ lesson }: VideoLessonPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const lastSentAtRef = useRef(0)
  const hasRetriedRef = useRef(false)
  const hasAppliedResumeRef = useRef(false)

  const mediaUrl = useLessonMediaUrl()
  const updateProgress = useUpdateLessonProgress(lesson.courseId, lesson.id)

  useEffect(() => {
    hasRetriedRef.current = false
    hasAppliedResumeRef.current = false
    mediaUrl.mutate({ courseId: lesson.courseId, lessonId: lesson.id })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only when navigating to a different lesson, not on every mediaUrl/updateProgress identity change
  }, [lesson.courseId, lesson.id])

  function sendPosition(currentTime: number) {
    lastSentAtRef.current = Date.now()
    updateProgress.mutate(Math.round(currentTime))
  }

  useEffect(() => {
    const video = videoRef.current
    return () => {
      if (video && video.currentTime > 0) sendPosition(video.currentTime)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once on unmount for this lesson, using whatever currentTime the video reached
  }, [lesson.id])

  if (mediaUrl.status === 'error') {
    return (
      <ErrorState
        title="Couldn't load this video"
        description="The video link may have expired. Please try again."
        onRetry={() => {
          mediaUrl.mutate({ courseId: lesson.courseId, lessonId: lesson.id })
        }}
      />
    )
  }

  if (mediaUrl.status !== 'success') {
    return (
      <div className="bg-charcoal flex aspect-video items-center justify-center rounded-xl">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <video
        ref={videoRef}
        key={mediaUrl.data.url}
        src={mediaUrl.data.url}
        controls
        className="aspect-video w-full rounded-xl bg-black"
        onLoadedMetadata={(event) => {
          const position = lesson.progress?.videoPositionSeconds ?? 0
          if (
            !hasAppliedResumeRef.current &&
            position > 0 &&
            position < event.currentTarget.duration
          ) {
            event.currentTarget.currentTime = position
          }
          hasAppliedResumeRef.current = true
        }}
        onTimeUpdate={(event) => {
          const now = Date.now()
          if (now - lastSentAtRef.current >= HEARTBEAT_INTERVAL_MS) {
            sendPosition(event.currentTarget.currentTime)
          }
        }}
        onPause={(event) => {
          sendPosition(event.currentTarget.currentTime)
        }}
        onSeeked={(event) => {
          sendPosition(event.currentTarget.currentTime)
        }}
        onError={() => {
          if (hasRetriedRef.current) return
          hasRetriedRef.current = true
          mediaUrl.mutate({ courseId: lesson.courseId, lessonId: lesson.id })
        }}
      />

      <LessonResourcesList resources={lesson.resources} />
    </div>
  )
}
