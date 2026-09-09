import { describe, expect, it } from 'vitest'
import { computed, nextTick, ref } from 'vue'
import { useDataList } from './useDataList'

interface Row {
  id: string
  name: string
  status: string
  size: number
}

const rows: Row[] = [
  { id: '1', name: 'Bronze Age', status: 'active', size: 30 },
  { id: '2', name: 'Ceramics', status: 'draft', size: 4 },
  { id: '3', name: 'Ámphoras', status: 'active', size: 100 },
]

describe('useDataList', () => {
  it('searches the configured fields, case-insensitively', () => {
    const list = useDataList<Row>(rows, { searchFields: (r) => [r.name] })
    list.search.value = 'cera'
    expect(list.filtered.value.map((r) => r.id)).toEqual(['2'])
  })

  it('searches every string field by default', () => {
    const list = useDataList<Row>(rows)
    list.search.value = 'draft'
    expect(list.filtered.value.map((r) => r.id)).toEqual(['2'])
  })

  it('sorts strings ignoring accents', () => {
    const list = useDataList<Row>(rows, { initialSort: { key: 'name' } })
    expect(list.filtered.value.map((r) => r.id)).toEqual(['3', '1', '2'])
  })

  it('sorts numbers numerically, not lexically', () => {
    const list = useDataList<Row>(rows, { initialSort: { key: 'size' } })
    expect(list.filtered.value.map((r) => r.size)).toEqual([4, 30, 100])
  })

  it('flips direction when the active key is toggled again', () => {
    const list = useDataList<Row>(rows, { initialSort: { key: 'name' } })
    list.toggleSort('name')
    expect(list.sortDirection.value).toBe('desc')
    expect(list.filtered.value.map((r) => r.id)).toEqual(['2', '1', '3'])

    list.toggleSort('size')
    expect(list.sortKey.value).toBe('size')
    expect(list.sortDirection.value).toBe('asc')
  })

  it('sorts empty values last in both directions', () => {
    const withBlank: Row[] = [...rows, { id: '4', name: '', status: 'active', size: 1 }]
    const list = useDataList<Row>(withBlank, { initialSort: { key: 'name' } })
    expect(list.filtered.value.at(-1)?.id).toBe('4')
    list.toggleSort('name')
    expect(list.filtered.value.at(-1)?.id).toBe('4')
  })

  it('paginates and reports the total across all pages', () => {
    const list = useDataList<Row>(rows, { pageSize: 2, initialSort: { key: 'size' } })
    expect(list.total.value).toBe(3)
    expect(list.totalPages.value).toBe(2)
    expect(list.rows.value.map((r) => r.size)).toEqual([4, 30])
    list.page.value = 2
    expect(list.rows.value.map((r) => r.size)).toEqual([100])
  })

  it('applies facet predicates', () => {
    const status = ref('active')
    const filters = computed(() => [(r: Row) => r.status === status.value])
    const list = useDataList<Row>(rows, { filters })
    expect(list.filtered.value.map((r) => r.id)).toEqual(['1', '3'])
    status.value = 'draft'
    expect(list.filtered.value.map((r) => r.id)).toEqual(['2'])
  })

  it('returns to the first page when the search narrows the result set', async () => {
    const list = useDataList<Row>(rows, { pageSize: 1 })
    list.page.value = 3
    list.search.value = 'a'
    await nextTick()
    expect(list.page.value).toBe(1)
  })

  it('clamps the page when the collection shrinks under it', async () => {
    const source = ref<Row[]>(rows)
    const list = useDataList<Row>(source, { pageSize: 1 })
    list.page.value = 3
    source.value = [rows[0]]
    await nextTick()
    expect(list.page.value).toBe(1)
  })

  it('tracks a reactive source', () => {
    const source = ref<Row[] | undefined>(undefined)
    const list = useDataList<Row>(source)
    expect(list.total.value).toBe(0)
    source.value = rows
    expect(list.total.value).toBe(3)
  })
})
