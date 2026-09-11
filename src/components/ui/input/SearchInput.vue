<script setup lang="ts">
import { Search } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

/**
 * The list-screen search box. Three screens had this same label/icon/input stack copied out by
 * hand, which is how they ended up with three different accessible names and one of them a
 * different height.
 */
const props = defineProps<{
  /** Accessible name — the visible label is the placeholder. */
  label: string
  placeholder?: string
  class?: string
}>()

const model = defineModel<string>({ default: '' })
</script>

<template>
  <label :class="cn('relative min-w-56 flex-1', props.class)">
    <span class="sr-only">{{ props.label }}</span>
    <Search
      class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
    />
    <input
      v-model="model"
      type="search"
      :placeholder="props.placeholder ?? 'Search…'"
      class="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    />
  </label>
</template>
