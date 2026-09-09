<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

const props = defineProps<{
  /** 1-based current page. */
  page: number
  pageSize: number
  /** Total number of rows across all pages (not the rows on this page). */
  total: number
  class?: string
}>()

const emit = defineEmits<{ (e: 'update:page', value: number): void }>()

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const firstShown = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1))
const lastShown = computed(() => Math.min(props.page * props.pageSize, props.total))

/**
 * A compact window of page numbers: always the first and last page, the current page and its
 * immediate neighbours, with `null` marking an elided run rendered as an ellipsis.
 */
const pages = computed<(number | null)[]>(() => {
  const last = totalPages.value
  const current = props.page
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1)

  const window = new Set([1, last, current, current - 1, current + 1])
  const shown = [...window].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b)

  const out: (number | null)[] = []
  shown.forEach((p, i) => {
    if (i > 0 && p - shown[i - 1] > 1) out.push(null)
    out.push(p)
  })
  return out
})

function go(page: number) {
  const clamped = Math.min(Math.max(page, 1), totalPages.value)
  if (clamped !== props.page) emit('update:page', clamped)
}

const pageButton =
  'inline-flex h-8 min-w-8 items-center justify-center rounded-sm px-2 text-xs font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40'
</script>

<template>
  <nav
    v-if="total > 0"
    aria-label="Pagination"
    :class="cn('flex flex-wrap items-center justify-between gap-3', props.class)"
  >
    <p class="text-xs text-muted-foreground">
      Showing <span class="font-bold text-foreground">{{ firstShown }}–{{ lastShown }}</span>
      of <span class="font-bold text-foreground">{{ total }}</span>
    </p>

    <div v-if="totalPages > 1" class="flex items-center gap-1">
      <button
        type="button"
        aria-label="Previous page"
        :class="[pageButton, 'text-muted-foreground hover:bg-secondary']"
        :disabled="page <= 1"
        @click="go(page - 1)"
      >
        <ChevronLeft class="h-4 w-4" />
      </button>

      <template v-for="(entry, index) in pages" :key="`${entry}-${index}`">
        <span v-if="entry === null" class="px-1 text-xs text-muted-foreground">…</span>
        <button
          v-else
          type="button"
          :aria-label="`Page ${entry}`"
          :aria-current="entry === page ? 'page' : undefined"
          :class="[
            pageButton,
            entry === page
              ? 'bg-brand-deep text-white'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
          ]"
          @click="go(entry)"
        >
          {{ entry }}
        </button>
      </template>

      <button
        type="button"
        aria-label="Next page"
        :class="[pageButton, 'text-muted-foreground hover:bg-secondary']"
        :disabled="page >= totalPages"
        @click="go(page + 1)"
      >
        <ChevronRight class="h-4 w-4" />
      </button>
    </div>
  </nav>
</template>
