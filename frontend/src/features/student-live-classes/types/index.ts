export type LiveClassStatus = 'DRAFT' | 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED'
export type LiveClassDeliveryMode = 'ONLINE' | 'OFFLINE' | 'HYBRID'

/**
 * Mirrors `backend/src/services/student-live-class-dto.ts#StudentLiveClassDto`
 * exactly — deliberately has NO `joinUrl`/`hostUrl` field (the task's own
 * "never put a long-lived provider URL in a broad list DTO" rule). The join
 * link is only ever fetched, access- and time-window-checked, via
 * `getJoinDetails`.
 */
export interface StudentLiveClass {
  id: string
  sessionCode: string
  courseId: string
  courseTitle: string
  batchId: string
  batchName: string
  title: string
  description: string | null
  scheduledDate: string
  startDateTime: string
  endDateTime: string
  timezone: string
  durationMinutes: number
  deliveryMode: LiveClassDeliveryMode
  status: LiveClassStatus
  trainerName: string | null
  canJoin: boolean
  joinWindowOpensAt: string
}

export interface LiveClassJoinDetails {
  joinUrl: string
  sessionTitle: string
  startDateTime: string
  endDateTime: string
}
