import { describe, expect, it, vi } from 'vitest'

vi.mock('../../src/config/redis', () => ({
  isRedisConnected: vi.fn(() => false),
  redisClient: {
    get: vi.fn(),
    set: vi.fn(),
  },
}))

import { isRedisConnected, redisClient } from '../../src/config/redis'
import { getCachedDashboard, setCachedDashboard } from '../../src/services/dashboard-cache.service'

describe('dashboard-cache.service — Redis unavailable', () => {
  it('getCachedDashboard returns null without touching Redis when disconnected', async () => {
    const result = await getCachedDashboard('some-key')
    expect(result).toBeNull()
    expect(redisClient.get).not.toHaveBeenCalled()
  })

  it('setCachedDashboard resolves without touching Redis when disconnected', async () => {
    await expect(setCachedDashboard('some-key', { a: 1 }, 60)).resolves.toBeUndefined()
    expect(redisClient.set).not.toHaveBeenCalled()
  })
})

describe('dashboard-cache.service — Redis connected but erroring', () => {
  it('getCachedDashboard swallows a read error and returns null', async () => {
    vi.mocked(isRedisConnected).mockReturnValue(true)
    vi.mocked(redisClient.get).mockRejectedValueOnce(new Error('connection reset'))

    const result = await getCachedDashboard('some-key')
    expect(result).toBeNull()
  })

  it('setCachedDashboard swallows a write error rather than throwing', async () => {
    vi.mocked(isRedisConnected).mockReturnValue(true)
    vi.mocked(redisClient.set).mockRejectedValueOnce(new Error('connection reset'))

    await expect(setCachedDashboard('some-key', { a: 1 }, 60)).resolves.toBeUndefined()
  })

  it('getCachedDashboard returns the parsed cached value on a hit', async () => {
    vi.mocked(isRedisConnected).mockReturnValue(true)
    vi.mocked(redisClient.get).mockResolvedValueOnce(JSON.stringify({ hello: 'world' }))

    const result = await getCachedDashboard<{ hello: string }>('some-key')
    expect(result).toEqual({ hello: 'world' })
  })
})
