import { describe, expect, it, vi } from 'vitest'

import { broadcastAuthEvent, subscribeToAuthEvents } from '@/shared/lib/multi-tab-sync'

describe('multi-tab-sync', () => {
  it('does not deliver a broadcast back to its own originating subscriber', async () => {
    const handler = vi.fn()
    const unsubscribe = subscribeToAuthEvents(handler)

    broadcastAuthEvent('LOGOUT')

    // BroadcastChannel delivery to *other* contexts is asynchronous even
    // within the same process in some environments — this only asserts the
    // same-tab suppression, which is synchronous by construction (`origin`
    // check), so a microtask flush is enough.
    await Promise.resolve()
    expect(handler).not.toHaveBeenCalled()

    unsubscribe()
  })

  it('never includes the access token in a broadcast payload', () => {
    const postMessageSpy = vi.spyOn(BroadcastChannel.prototype, 'postMessage')

    broadcastAuthEvent('SESSION_INVALIDATED')

    expect(postMessageSpy).toHaveBeenCalledTimes(1)
    const payload = JSON.stringify(postMessageSpy.mock.calls[0]?.[0])
    expect(payload).not.toMatch(/token/i)
    expect(payload).toContain('SESSION_INVALIDATED')

    postMessageSpy.mockRestore()
  })
})
