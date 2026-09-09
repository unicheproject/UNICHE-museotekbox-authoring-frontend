import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'
import { AxiosError, AxiosHeaders } from 'axios'
import { clearQueryCache, invalidateQueries, useMutation, useQuery } from './useQuery'

afterEach(() => {
  clearQueryCache()
})

/** useQuery registers scope cleanup, so every subscription is made inside a real effect scope. */
function inScope<T>(fn: () => T): { result: T; stop: () => void } {
  const scope = effectScope()
  const result = scope.run(fn) as T
  return { result, stop: () => scope.stop() }
}

/** Let the fetch promise chain settle (then + finally + watcher flush). */
async function settle() {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await nextTick()
}

describe('useQuery', () => {
  it('fetches once and exposes the result', async () => {
    const fetcher = vi.fn().mockResolvedValue(['a'])
    const { result } = inScope(() => useQuery('items', fetcher))

    expect(result.loading.value).toBe(true)
    expect(result.pending.value).toBe(true)
    await settle()

    expect(result.data.value).toEqual(['a'])
    expect(result.loading.value).toBe(false)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('serves a second subscriber from cache instead of refetching', async () => {
    const fetcher = vi.fn().mockResolvedValue(['a'])
    const first = inScope(() => useQuery('items', fetcher))
    await settle()

    const second = inScope(() => useQuery('items', fetcher))
    await settle()

    expect(second.result.data.value).toEqual(['a'])
    expect(fetcher).toHaveBeenCalledTimes(1)
    first.stop()
    second.stop()
  })

  it('de-duplicates concurrent subscribers into one request', async () => {
    const fetcher = vi.fn().mockResolvedValue(['a'])
    inScope(() => useQuery('items', fetcher))
    inScope(() => useQuery('items', fetcher))
    await settle()
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('refetches once the cached result is stale', async () => {
    const fetcher = vi.fn().mockResolvedValue(['a'])
    const first = inScope(() => useQuery('items', fetcher, { staleMs: 0 }))
    await settle()
    first.stop()

    inScope(() => useQuery('items', fetcher, { staleMs: 0 }))
    await settle()
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('reports a readable error and keeps loading false', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('boom'))
    const { result } = inScope(() => useQuery('items', fetcher))
    await settle()

    expect(result.error.value).toBe('boom')
    expect(result.loading.value).toBe(false)
  })

  it('does not fetch while disabled, then fetches when enabled', async () => {
    const enabled = ref(false)
    const fetcher = vi.fn().mockResolvedValue(['a'])
    const { result } = inScope(() => useQuery('items', fetcher, { enabled: () => enabled.value }))
    await settle()
    expect(fetcher).not.toHaveBeenCalled()
    expect(result.data.value).toBeUndefined()

    enabled.value = true
    await settle()
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(result.data.value).toEqual(['a'])
  })

  it('follows a reactive key', async () => {
    const orgId = ref('org-1')
    const fetcher = vi.fn(async () => [orgId.value])
    const { result } = inScope(() => useQuery(() => ['projects', orgId.value], fetcher))
    await settle()
    expect(result.data.value).toEqual(['org-1'])

    orgId.value = 'org-2'
    await settle()
    expect(result.data.value).toEqual(['org-2'])
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('refetches a watched query on invalidation, matching by key prefix', async () => {
    const fetcher = vi.fn().mockResolvedValue(['a'])
    inScope(() => useQuery(['projects', 'org-1'], fetcher))
    await settle()
    expect(fetcher).toHaveBeenCalledTimes(1)

    invalidateQueries('projects')
    await settle()
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('leaves unrelated queries alone when invalidating', async () => {
    const projects = vi.fn().mockResolvedValue(['a'])
    const organisations = vi.fn().mockResolvedValue(['b'])
    inScope(() => useQuery('projects', projects))
    inScope(() => useQuery('organisations', organisations))
    await settle()

    invalidateQueries('projects')
    await settle()
    expect(projects).toHaveBeenCalledTimes(2)
    expect(organisations).toHaveBeenCalledTimes(1)
  })

  it('stops tracking a query once its scope is disposed', async () => {
    const fetcher = vi.fn().mockResolvedValue(['a'])
    const { stop } = inScope(() => useQuery('items', fetcher))
    await settle()
    stop()

    invalidateQueries('items')
    await settle()
    // Nothing is mounted to show the result, so the refetch is deferred to the next subscriber.
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})

describe('useMutation', () => {
  it('reports success and invalidates the listed queries', async () => {
    const fetcher = vi.fn().mockResolvedValue(['a'])
    inScope(() => useQuery('projects', fetcher))
    await settle()

    const mutator = vi.fn().mockResolvedValue({ id: 'p1' })
    const { result } = inScope(() => useMutation(mutator, { invalidates: ['projects'] }))
    const outcome = await result.mutate()
    await settle()

    expect(outcome).toEqual({ ok: true, data: { id: 'p1' } })
    expect(result.loading.value).toBe(false)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('splits a validation failure into form-level and per-field messages', async () => {
    const error = new AxiosError('Request failed')
    error.response = {
      status: 400,
      statusText: '',
      data: { message: 'Invalid', details: ['name: must not be blank'] },
      headers: new AxiosHeaders(),
      config: { headers: new AxiosHeaders() },
    }
    const { result } = inScope(() => useMutation(vi.fn().mockRejectedValue(error)))

    const outcome = await result.mutate()
    expect(outcome.ok).toBe(false)
    expect(result.fieldErrors.value).toEqual({ name: 'Must not be blank' })
    expect(result.error.value).toBe('Please correct the highlighted fields.')
  })

  it('does not invalidate anything when the call fails', async () => {
    const fetcher = vi.fn().mockResolvedValue(['a'])
    inScope(() => useQuery('projects', fetcher))
    await settle()

    const { result } = inScope(() =>
      useMutation(vi.fn().mockRejectedValue(new Error('nope')), { invalidates: ['projects'] }),
    )
    await result.mutate()
    await settle()
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('clears previous errors on the next attempt', async () => {
    const mutator = vi
      .fn()
      .mockRejectedValueOnce(new Error('nope'))
      .mockResolvedValueOnce('ok')
    const { result } = inScope(() => useMutation(mutator))

    await result.mutate()
    expect(result.error.value).toBe('nope')

    await result.mutate()
    expect(result.error.value).toBeNull()
  })
})
