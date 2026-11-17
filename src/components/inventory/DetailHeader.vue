<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AIcon from '@/components/authoring/AIcon.vue'

/**
 * The top of a detail screen, drawn like the experience editor's header: a white panel with where
 * you are (Scan objects › its name), the name, the pills under it and the actions on the right.
 * An optional `lead` slot puts a tile (the thing's icon or colour) before the name; with it, the
 * actions sit level with the name rather than on the line of the pills. The name keeps at least
 * 12rem, so on a phone the actions wrap to their own row instead of squeezing it to one letter.
 */
defineProps<{ crumb: string; crumbTo: string; title: string }>()
</script>

<template>
  <div class="mb-6 rounded-lg bg-white px-5 py-5 shadow-xs sm:px-6">
    <nav aria-label="You are here" class="mb-2 flex min-w-0 items-center gap-1.5 text-[13px] font-semibold">
      <RouterLink :to="crumbTo" class="shrink-0 text-muted-foreground hover:text-brand-deep hover:underline">{{ crumb }}</RouterLink>
      <AIcon name="chev" cls="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
      <span aria-current="page" class="min-w-0 truncate text-foreground">{{ title }}</span>
    </nav>
    <div class="flex flex-wrap justify-between gap-x-4 gap-y-3" :class="$slots.lead ? 'items-center' : 'items-end'">
      <div v-if="$slots.lead" class="shrink-0"><slot name="lead" /></div>
      <div :class="$slots.lead ? 'min-w-[12rem] flex-1' : 'min-w-0'">
        <h1 class="truncate text-2xl font-bold leading-tight tracking-tight">{{ title }}</h1>
        <div v-if="$slots.pills" class="mt-2 flex flex-wrap items-center gap-1.5"><slot name="pills" /></div>
      </div>
      <div v-if="$slots.actions" class="flex flex-wrap gap-2"><slot name="actions" /></div>
    </div>
  </div>
</template>
