import { computed, onScopeDispose, ref, shallowRef, watch, type Ref } from 'vue'
import { parseError } from './fieldErrors'

/**
 * Minimal server-state layer: a keyed cache with shared reactive state, in-flight de-duplication
 * and invalidation, so a list refreshes itself after a mutation instead of every view hand-rolling
 * its own `load()`.
 *
 * It is deliberately in-house rather than a data-fetching dependency: the project pins exact
 * versions and keeps its dependency surface small (see CLAUDE.md), and the backend exposes plain
 * unpaginated collections, so none of a full library's transport features would be used.
 */
export type QueryKey = string | readonly (string | number | null | undefined)[]

/** Cache entries live for the session; `staleMs` decides when a mounting view refetches. */
const DEFAULT_STALE_MS = 30_000

interface CacheEntry {
  key: string
  data: Ref<unknown>
  error: Ref<string | null>
  loading: Ref<boolean>
  /** 0 means "never successfully fetched" or "explicitly invalidated". */
  fetchedAt: number
  fetcher: () => Promise<unknown>
  subscribers: number
  inFlight: Promise<void> | null
}

const cache = new Map<string, CacheEntry>()

export function serializeKey(key: QueryKey): string {
  return typeof key === 'string' ? key : key.map((part) => String(part ?? '')).join('/')
}

function run(entry: CacheEntry, force = false): Promise<void> {
  if (entry.inFlight && !force) return entry.inFlight

  entry.loading.value = true
  const promise = entry
    .fetcher()
    .then((data) => {
      entry.data.value = data
      entry.error.value = null
      entry.fetchedAt = Date.now()
    })
    .catch((e: unknown) => {
      entry.error.value = parseError(e).message
    })
    .finally(() => {
      // Only the newest run may clear the slot; a forced refetch can overlap an older one.
      if (entry.inFlight === promise) {
        entry.inFlight = null
        entry.loading.value = false
      }
    })

  entry.inFlight = promise
  return promise
}

function entryFor(key: string, fetcher: () => Promise<unknown>): CacheEntry {
  const existing = cache.get(key)
  if (existing) {
    // Adopt the newest closure: it captures the caller's current reactive scope.
    existing.fetcher = fetcher
    return existing
  }
  const created: CacheEntry = {
    key,
    data: shallowRef<unknown>(undefined),
    error: ref<string | null>(null),
    loading: ref(false),
    fetchedAt: 0,
    fetcher,
    subscribers: 0,
    inFlight: null,
  }
  cache.set(key, created)
  return created
}

export interface UseQueryOptions {
  /** How long a cached result is served without refetching on mount. Default 30s. */
  staleMs?: number
  /** Skip fetching while this returns false (e.g. waiting for the authorization context). */
  enabled?: () => boolean
}

export interface UseQueryResult<T> {
  data: Ref<T | undefined>
  error: Ref<string | null>
  /** True only while a request is in flight — check `data` to tell first load from a refresh. */
  loading: Ref<boolean>
  /** True on the first load, when there is nothing cached to show yet. */
  pending: Ref<boolean>
  refresh: () => Promise<void>
}

/**
 * Subscribe to a cached query. `key` may be a getter, in which case the subscription follows it —
 * returning `null` from the getter (or a false `enabled`) parks the query without fetching.
 */
export function useQuery<T>(
  key: QueryKey | (() => QueryKey | null),
  fetcher: () => Promise<T>,
  options: UseQueryOptions = {},
): UseQueryResult<T> {
  const staleMs = options.staleMs ?? DEFAULT_STALE_MS
  const keyGetter = typeof key === 'function' ? key : () => key
  const active = shallowRef<CacheEntry | null>(null)

  function release() {
    if (active.value) {
      active.value.subscribers = Math.max(0, active.value.subscribers - 1)
      active.value = null
    }
  }

  watch(
    () => {
      if (options.enabled && !options.enabled()) return null
      const raw = keyGetter()
      return raw === null ? null : serializeKey(raw)
    },
    (serialized) => {
      release()
      if (serialized === null) return
      const entry = entryFor(serialized, fetcher as () => Promise<unknown>)
      entry.subscribers += 1
      active.value = entry
      // `>=` so that `staleMs: 0` means "always refetch", even within the same millisecond.
      if (!entry.fetchedAt || Date.now() - entry.fetchedAt >= staleMs) {
        void run(entry)
      }
    },
    { immediate: true },
  )

  onScopeDispose(release)

  const data = computed(() => active.value?.data.value as T | undefined)
  const error = computed(() => active.value?.error.value ?? null)
  const loading = computed(() => active.value?.loading.value ?? false)
  const pending = computed(() => loading.value && data.value === undefined)

  return {
    data: data as Ref<T | undefined>,
    error: error as Ref<string | null>,
    loading: loading as Ref<boolean>,
    pending: pending as Ref<boolean>,
    refresh: () => (active.value ? run(active.value, true) : Promise.resolve()),
  }
}

/**
 * Mark cached queries stale and refetch the ones a mounted view is watching. Keys match by
 * prefix, so `invalidateQueries('projects')` also clears `projects/<orgId>`.
 */
export function invalidateQueries(...keys: QueryKey[]): void {
  const prefixes = keys.map(serializeKey)
  for (const entry of cache.values()) {
    const matches = prefixes.length === 0 || prefixes.some((prefix) => entry.key.startsWith(prefix))
    if (!matches) continue
    entry.fetchedAt = 0
    if (entry.subscribers > 0) void run(entry, true)
  }
}

/** Drop everything — used by tests and on sign-out, where cached data must not outlive the session. */
export function clearQueryCache(): void {
  cache.clear()
}

export interface UseMutationOptions {
  /** Query keys (by prefix) to invalidate after a successful call. */
  invalidates?: QueryKey[]
  /**
   * Translate an error this caller understands into its own message — returning null falls back to
   * the generic parsing. Lets a screen say "that RFID tag is already in use" for a 409 instead of
   * relaying whatever prose the backend happened to send.
   */
  describe?: (error: unknown) => string | null
}

export interface MutationOutcome<R> {
  ok: boolean
  data?: R
}

export interface UseMutationResult<Args extends unknown[], R> {
  mutate: (...args: Args) => Promise<MutationOutcome<R>>
  loading: Ref<boolean>
  /** Form-level message; per-field messages land in `fieldErrors`. */
  error: Ref<string | null>
  fieldErrors: Ref<Record<string, string>>
  reset: () => void
}

/**
 * Wrap a write call: tracks in-flight state, splits backend validation errors into form-level and
 * per-field messages, and invalidates the affected queries on success. `mutate` never throws —
 * it reports failure through `ok` so callers can drive the UI without try/catch.
 */
export function useMutation<Args extends unknown[], R>(
  mutator: (...args: Args) => Promise<R>,
  options: UseMutationOptions = {},
): UseMutationResult<Args, R> {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const fieldErrors = ref<Record<string, string>>({})

  function reset() {
    error.value = null
    fieldErrors.value = {}
  }

  async function mutate(...args: Args): Promise<MutationOutcome<R>> {
    loading.value = true
    reset()
    try {
      const data = await mutator(...args)
      if (options.invalidates?.length) invalidateQueries(...options.invalidates)
      return { ok: true, data }
    } catch (e) {
      const parsed = parseError(e)
      error.value = options.describe?.(e) ?? parsed.message
      fieldErrors.value = parsed.fields
      return { ok: false }
    } finally {
      loading.value = false
    }
  }

  return { mutate, loading, error, fieldErrors, reset }
}
