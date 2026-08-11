const CHANNEL_NAME = 'daisy-minds-auth-sync'
const STORAGE_FALLBACK_KEY = 'daisy-minds-auth-sync-ping'

export type AuthSyncEventType = 'LOGOUT' | 'LOGOUT_ALL' | 'SESSION_INVALIDATED'

interface AuthSyncEvent {
  type: AuthSyncEventType
  /** Distinguishes this tab's own broadcast from the echo it receives via `storage` in browsers without BroadcastChannel. */
  origin: string
}

const tabId = crypto.randomUUID()
const channel: BroadcastChannel | null =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null

/**
 * Cross-tab auth sync. Never broadcasts the access token itself — only an
 * event name — so a compromised or merely nosy other tab learns nothing
 * more than "some tab logged out."
 */
export function broadcastAuthEvent(type: AuthSyncEventType): void {
  const event: AuthSyncEvent = { type, origin: tabId }

  if (channel) {
    channel.postMessage(event)
    return
  }

  // Fallback: a `storage` event fires in *other* tabs when a key changes.
  // The value itself carries no sensitive data, only the event type + a
  // timestamp to guarantee the value actually changes on every call.
  window.localStorage.setItem(STORAGE_FALLBACK_KEY, `${type}:${Date.now().toString()}`)
}

export function subscribeToAuthEvents(onEvent: (type: AuthSyncEventType) => void): () => void {
  if (channel) {
    const handler = (event: MessageEvent<AuthSyncEvent>) => {
      if (event.data.origin !== tabId) {
        onEvent(event.data.type)
      }
    }
    channel.addEventListener('message', handler)
    return () => {
      channel.removeEventListener('message', handler)
    }
  }

  const handler = (event: StorageEvent) => {
    if (event.key !== STORAGE_FALLBACK_KEY || !event.newValue) return
    const [type] = event.newValue.split(':')
    if (type === 'LOGOUT' || type === 'LOGOUT_ALL' || type === 'SESSION_INVALIDATED') {
      onEvent(type)
    }
  }
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener('storage', handler)
  }
}
