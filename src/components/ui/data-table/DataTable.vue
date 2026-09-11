<script setup lang="ts" generic="T">
import { computed } from 'vue'
import type { Component } from 'vue'
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-vue-next'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert } from '@/components/ui/alert'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'
import type { DataTableColumn } from './types'
import type { SortDirection } from '@/lib/useDataList'

/**
 * Presentational data table. Sorting, searching and pagination *state* lives in `useDataList` in
 * the page, so a page can render the same filtered collection as cards or as a table without the
 * two views drifting apart; this component renders the rows it is handed and reports header
 * clicks. Pair it with `<Pagination>` for the page controls.
 */
const props = defineProps<{
  columns: DataTableColumn<T>[]
  /** The current page's rows, already filtered and sorted. */
  rows: T[]
  rowKey: (row: T) => string
  sortKey?: string | null
  sortDirection?: SortDirection
  loading?: boolean
  error?: string | null
  /** Shown when there are no rows and nothing is loading or failing. */
  emptyTitle?: string
  emptyIcon?: Component
  clickable?: boolean
  searchable?: boolean
  searchPlaceholder?: string
  skeletonRows?: number
  class?: string
}>()

const emit = defineEmits<{
  (e: 'sort', key: string): void
  (e: 'rowClick', row: T): void
}>()

const search = defineModel<string>('search', { default: '' })

const columnCount = computed(() => props.columns.length)
// Only the very first load shows skeletons; a background refresh keeps the current rows visible.
const showSkeleton = computed(() => props.loading && props.rows.length === 0)
const showEmpty = computed(() => !props.loading && !props.error && props.rows.length === 0)

const alignment: Record<'left' | 'center' | 'right', string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
}

function sortIcon(column: DataTableColumn<T>) {
  if (props.sortKey !== column.key) return ArrowUpDown
  return props.sortDirection === 'desc' ? ArrowDown : ArrowUp
}

/** `aria-sort` on the header tells screen readers the ordering without relying on the icon. */
function ariaSort(column: DataTableColumn<T>): 'ascending' | 'descending' | 'none' | undefined {
  if (!column.sortable) return undefined
  if (props.sortKey !== column.key) return 'none'
  return props.sortDirection === 'desc' ? 'descending' : 'ascending'
}

function cellText(column: DataTableColumn<T>, row: T): string {
  const value = column.value
    ? column.value(row)
    : (row as Record<string, unknown>)[column.key]
  return value === null || value === undefined ? '—' : String(value)
}
</script>

<template>
  <div :class="cn('space-y-3', props.class)">
    <div v-if="searchable || $slots.toolbar" class="flex flex-wrap items-center gap-3">
      <label v-if="searchable" class="relative min-w-56 flex-1">
        <span class="sr-only">Search</span>
        <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          v-model="search"
          type="search"
          :placeholder="searchPlaceholder ?? 'Search…'"
          class="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      <slot name="toolbar" />
    </div>

    <Alert v-if="error" variant="error" title="Couldn't load this list">{{ error }}</Alert>

    <Table>
      <TableHeader>
        <TableRow>
          <TableHead
            v-for="column in columns"
            :key="column.key"
            :aria-sort="ariaSort(column)"
            :class="cn(alignment[column.align ?? 'left'], column.headClass)"
          >
            <button
              v-if="column.sortable"
              type="button"
              class="inline-flex items-center gap-1.5 uppercase tracking-overline transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              @click="emit('sort', column.key)"
            >
              {{ column.label }}
              <component
                :is="sortIcon(column)"
                class="h-3 w-3"
                :class="sortKey === column.key ? 'text-brand-purple' : 'opacity-40'"
              />
            </button>
            <template v-else>{{ column.label }}</template>
          </TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        <template v-if="showSkeleton">
          <TableRow v-for="row in skeletonRows ?? 5" :key="`skeleton-${row}`">
            <TableCell v-for="column in columns" :key="column.key">
              <Skeleton class="h-4 w-full max-w-40" />
            </TableCell>
          </TableRow>
        </template>

        <TableRow v-else-if="showEmpty">
          <TableCell :colspan="columnCount" class="p-0">
            <slot name="empty">
              <EmptyState :title="emptyTitle ?? 'Nothing to show'" :icon="emptyIcon" />
            </slot>
          </TableCell>
        </TableRow>

        <TableRow
          v-for="row in rows"
          v-else
          :key="rowKey(row)"
          :clickable="clickable"
          @click="clickable && emit('rowClick', row)"
        >
          <TableCell
            v-for="column in columns"
            :key="column.key"
            :class="cn(alignment[column.align ?? 'left'], column.class)"
          >
            <slot :name="`cell-${column.key}`" :row="row">{{ cellText(column, row) }}</slot>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
