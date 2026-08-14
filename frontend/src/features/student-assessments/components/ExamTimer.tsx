import { useEffect, useRef, useState } from 'react'
import { Clock } from 'lucide-react'

import { cn } from '@/shared/lib/utils'

interface ExamTimerProps {
  expiresAt: string
  onExpire: () => void
}

function formatRemaining(ms: number): { label: string; minutes: number } {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  const label =
    hours > 0
      ? `${String(hours)}:${pad(minutes)}:${pad(seconds)}`
      : `${pad(minutes)}:${pad(seconds)}`
  return { label, minutes: Math.floor(totalSeconds / 60) }
}

/**
 * Server-authoritative countdown — `expiresAt` is never recomputed
 * client-side, only displayed. Calls `onExpire` exactly once when the
 * countdown reaches zero; the backend independently re-validates expiry on
 * every write regardless (task's own "never trust frontend timer for final
 * acceptance" rule). The visible digits tick every second, but the
 * screen-reader announcement only updates once a minute (or every 15s in
 * the final minute) so it never spams assistive tech.
 */
export function ExamTimer({ expiresAt, onExpire }: ExamTimerProps) {
  const target = new Date(expiresAt).getTime()
  const [remainingMs, setRemainingMs] = useState(() => target - Date.now())
  const hasExpiredRef = useRef(false)
  const lastAnnouncedMinuteRef = useRef<number | null>(null)
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = target - Date.now()
      setRemainingMs(remaining)
      if (remaining <= 0 && !hasExpiredRef.current) {
        hasExpiredRef.current = true
        onExpire()
      }
    }, 1000)
    return () => {
      clearInterval(interval)
    }
  }, [target, onExpire])

  const { label, minutes } = formatRemaining(remainingMs)
  const isCritical = remainingMs <= 60_000

  useEffect(() => {
    const shouldAnnounce = isCritical
      ? lastAnnouncedMinuteRef.current !== Math.floor(remainingMs / 15_000)
      : lastAnnouncedMinuteRef.current !== minutes
    if (shouldAnnounce) {
      lastAnnouncedMinuteRef.current = isCritical ? Math.floor(remainingMs / 15_000) : minutes
      setAnnouncement(minutes > 0 ? `${String(minutes)} minutes remaining` : `${label} remaining`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- announcement cadence is intentionally throttled, not tied to every remainingMs tick
  }, [minutes, isCritical])

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-sm font-semibold',
        isCritical
          ? 'border-destructive/40 bg-destructive/10 text-destructive'
          : 'border-border bg-muted',
      )}
    >
      <Clock className="size-4" aria-hidden="true" />
      <span aria-hidden="true">{label}</span>
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </div>
  )
}
