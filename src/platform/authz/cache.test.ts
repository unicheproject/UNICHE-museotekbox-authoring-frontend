import { describe, expect, it, vi } from 'vitest'
import { AuthorizationCache, type AuthorizationFetchResult } from './cache'
import type { AuthorizationContext } from './types'

function ctx(overrides: Partial<AuthorizationContext> = {}): AuthorizationContext {
  return {
    subject: 'sub-1',
    platformAdmin: false,
    managedOrganisations: [],
    projectMemberships: [],
    etag: 'W/"v1"',
    ttlSeconds: 30,
    ...overrides,
  }
}

describe('AuthorizationCache', () => {
  it('fetches once and serves cached within the TTL window', async () => {
    let now = 0
    const fetcher = vi.fn(async (): Promise<AuthorizationFetchResult> => ({
      status: 200,
      data: ctx(),
      etag: 'W/"v1"',
    }))
    const cache = new AuthorizationCache(fetcher, () => now)

    await cache.get()
    now = 10_000 // within 30s TTL
    await cache.get()

    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('re-fetches after the TTL expires', async () => {
    let now = 0
    const fetcher = vi.fn(async (): Promise<AuthorizationFetchResult> => ({
      status: 200,
      data: ctx(),
      etag: 'W/"v1"',
    }))
    const cache = new AuthorizationCache(fetcher, () => now)

    await cache.get()
    now = 31_000 // past 30s TTL
    await cache.get()

    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('sends the stored ETag and keeps the cached value on 304', async () => {
    let now = 0
    const fetcher = vi.fn(async (etag?: string): Promise<AuthorizationFetchResult> => {
      if (etag === 'W/"v1"') {
        return { status: 304 }
      }
      return { status: 200, data: ctx(), etag: 'W/"v1"' }
    })
    const cache = new AuthorizationCache(fetcher, () => now)

    const first = await cache.get()
    now = 31_000
    const second = await cache.get() // TTL expired -> revalidate -> 304 -> same data

    expect(second).toEqual(first)
    expect(fetcher).toHaveBeenLastCalledWith('W/"v1"')
  })

  it('invalidate() forces a re-fetch even within the TTL', async () => {
    let now = 0
    const fetcher = vi.fn(async (): Promise<AuthorizationFetchResult> => ({
      status: 200,
      data: ctx(),
      etag: 'W/"v1"',
    }))
    const cache = new AuthorizationCache(fetcher, () => now)

    await cache.get()
    cache.invalidate()
    await cache.get()

    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(cache.current()).not.toBeNull()
  })
})
