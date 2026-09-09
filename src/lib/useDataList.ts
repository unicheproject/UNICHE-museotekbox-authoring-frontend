import { computed, ref, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue'

export type SortDirection = 'asc' | 'desc'

export type SortValue = string | number | boolean | null | undefined

export interface UseDataListOptions<T> {
  /** Values the search box matches against. Defaults to every string property of the row. */
  searchFields?: (row: T) => SortValue[]
  /** Per-sort-key value extractors. A key with no extractor falls back to `row[key]`. */
  sortValues?: Record<string, (row: T) => SortValue>
  initialSort?: { key: string; direction?: SortDirection }
  pageSize?: number
  /**
   * Facet predicates (organisation, status, …). Kept here rather than pre-filtered by the caller
   * so that a facet change can reset the page — otherwise you land on an out-of-range page 4.
   */
  filters?: MaybeRefOrGetter<((row: T) => boolean)[]>
}

export interface UseDataListResult<T> {
  search: Ref<string>
  sortKey: Ref<string | null>
  sortDirection: Ref<SortDirection>
  page: Ref<number>
  pageSize: Ref<number>
  /** Everything matching the facets and the search term, sorted — across all pages. */
  filtered: Ref<T[]>
  /** The current page's slice, for rendering. */
  rows: Ref<T[]>
  total: Ref<number>
  totalPages: Ref<number>
  /** Sort by `key`, flipping direction when it is already the active key. */
  toggleSort: (key: string) => void
  reset: () => void
}

function normalise(value: SortValue): string {
  return String(value ?? '').toLowerCase()
}

function isEmpty(value: SortValue): boolean {
  return value === null || value === undefined || value === ''
}

function compare(a: SortValue, b: SortValue): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  // Locale-aware so accented names order the way a Greek or Italian curator expects.
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

/** Collect a row's own string/number properties, for the default search behaviour. */
function ownValues<T>(row: T): SortValue[] {
  if (!row || typeof row !== 'object') return [row as SortValue]
  return Object.values(row as Record<string, unknown>).filter(
    (value): value is string | number => typeof value === 'string' || typeof value === 'number',
  )
}

/**
 * Client-side search / sort / pagination over an in-memory collection.
 *
 * The backend returns whole unpaginated collections (`GET /organisations/{orgId}/projects` takes no
 * `page`, `sort` or `q`), so this is where those affordances live. If a collection ever outgrows
 * the browser, the same surface can be re-pointed at server-side parameters.
 */
export function useDataList<T>(
  source: MaybeRefOrGetter<T[] | undefined>,
  options: UseDataListOptions<T> = {},
): UseDataListResult<T> {
  const search = ref('')
  const sortKey = ref<string | null>(options.initialSort?.key ?? null)
  const sortDirection = ref<SortDirection>(options.initialSort?.direction ?? 'asc')
  const page = ref(1)
  const pageSize = ref(options.pageSize ?? 12)

  const filtered = computed<T[]>(() => {
    const all = toValue(source) ?? []
    const predicates = toValue(options.filters) ?? []
    const term = search.value.trim().toLowerCase()

    let result = predicates.length
      ? all.filter((row) => predicates.every((predicate) => predicate(row)))
      : [...all]

    if (term) {
      const fields = options.searchFields ?? ownValues
      result = result.filter((row) => fields(row).some((value) => normalise(value).includes(term)))
    }

    const key = sortKey.value
    if (key) {
      const extract =
        options.sortValues?.[key] ??
        ((row: T) => (row as Record<string, SortValue>)?.[key] as SortValue)
      const direction = sortDirection.value === 'asc' ? 1 : -1
      result.sort((a, b) => {
        const left = extract(a)
        const right = extract(b)
        // Empty values sink to the bottom in BOTH directions: reversing the sort should not
        // promote a row with a blank cell to the top of the list.
        if (isEmpty(left) || isEmpty(right)) {
          if (isEmpty(left) && isEmpty(right)) return 0
          return isEmpty(left) ? 1 : -1
        }
        return compare(left, right) * direction
      })
    }

    return result
  })

  const total = computed(() => filtered.value.length)
  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

  const rows = computed(() => {
    const start = (page.value - 1) * pageSize.value
    return filtered.value.slice(start, start + pageSize.value)
  })

  // Narrowing the result set must not leave the user stranded past the last page.
  watch([search, () => toValue(options.filters)], () => {
    page.value = 1
  })
  watch(totalPages, (pages) => {
    if (page.value > pages) page.value = pages
  })

  function toggleSort(key: string) {
    if (sortKey.value === key) {
      sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortKey.value = key
      sortDirection.value = 'asc'
    }
    page.value = 1
  }

  function reset() {
    search.value = ''
    page.value = 1
    sortKey.value = options.initialSort?.key ?? null
    sortDirection.value = options.initialSort?.direction ?? 'asc'
  }

  return {
    search,
    sortKey,
    sortDirection,
    page,
    pageSize,
    filtered,
    rows,
    total,
    totalPages,
    toggleSort,
    reset,
  }
}
