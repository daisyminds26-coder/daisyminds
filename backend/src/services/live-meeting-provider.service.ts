import { ApiError } from '../utils/api-error'
import type { LiveClassProvider } from '../models/live-class.model'

const SAFE_URL_SCHEME = /^https:\/\//i

/**
 * The adapter boundary for turning a `LiveClassProvider` selection into
 * actual join/host details. `LiveMeetingProvider` is the shape any future
 * real integration (Google Meet/Zoom/Microsoft Teams) implements — swapping
 * one in later is a service-layer change, never a rewrite of the session
 * domain (`live-class.service.ts` only ever calls this interface).
 */
export interface LiveMeetingDetails {
  joinUrl: string
  hostUrl: string | null
  providerMeetingId: string | null
}

export interface LiveMeetingProvider {
  createMeeting(input: { joinUrl: string; hostUrl?: string | null }): Promise<LiveMeetingDetails>
  cancelMeeting(providerMeetingId: string | null): Promise<void>
}

function assertSafeMeetingUrl(url: string): void {
  if (!SAFE_URL_SCHEME.test(url)) {
    throw ApiError.badRequest('Meeting links must be a valid HTTPS URL')
  }
  // Defense in depth against a scheme-confusion payload slipping past the regex above (e.g. "https:\t//javascript:...") — parse and re-check the protocol via the URL constructor, never fetched.
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw ApiError.badRequest('Meeting links must be a valid HTTPS URL')
  }
  if (parsed.protocol !== 'https:') {
    throw ApiError.badRequest('Meeting links must be a valid HTTPS URL')
  }
}

/**
 * The only provider actually implemented this phase — an admin pastes a
 * real HTTPS meeting URL (and optionally a distinct host URL), validated
 * and stored as-is. No external call is ever made (no SSRF surface: the
 * URL is never fetched server-side, only validated by scheme).
 */
class ManualLinkProvider implements LiveMeetingProvider {
  async createMeeting(input: {
    joinUrl: string
    hostUrl?: string | null
  }): Promise<LiveMeetingDetails> {
    assertSafeMeetingUrl(input.joinUrl)
    if (input.hostUrl) assertSafeMeetingUrl(input.hostUrl)
    return Promise.resolve({
      joinUrl: input.joinUrl,
      hostUrl: input.hostUrl ?? null,
      providerMeetingId: null,
    })
  }

  async cancelMeeting(): Promise<void> {
    return Promise.resolve()
  }
}

/**
 * `GOOGLE_MEET`/`ZOOM`/`MICROSOFT_TEAMS`/`OTHER` have no real credentials
 * configured this phase (task's own explicit instruction: implement the
 * adapter architecture, but never call a real provider without them) — they
 * resolve to the same manual-link behavior as `MANUAL_LINK` for now (an
 * admin still supplies the URL directly), while the stored `provider` enum
 * value stays accurate for once a real integration exists. `OFFLINE`
 * never reaches this registry at all — it has no meeting to create.
 */
const manualLinkProvider = new ManualLinkProvider()

export function resolveLiveMeetingProvider(provider: LiveClassProvider): LiveMeetingProvider {
  if (provider === 'OFFLINE') {
    throw new Error('OFFLINE sessions have no meeting provider')
  }
  return manualLinkProvider
}
