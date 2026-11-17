<script setup lang="ts">
import type { Component } from 'vue'

/**
 * One shape for "there is nothing here": a glyph, the name of what is missing, at most a line or
 * two on what it is, and at most one action. The screens previously had four different versions of
 * this — a dashed panel, a card with two lines of prose, a table row, a bare paragraph.
 *
 * `description` explains the thing to someone meeting it for the first time; `tone="brand"` puts
 * the glyph on the soft brand tint (a welcome), the default muted grey suits "nothing matches".
 */
defineProps<{
  title: string
  icon?: Component
  description?: string
  tone?: 'muted' | 'brand'
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center px-6 py-14 text-center">
    <div
      v-if="icon"
      class="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
      :class="tone === 'brand' ? 'bg-brand-deep/[.07] text-brand-deep' : 'bg-surface-2 text-muted-foreground'"
    >
      <component :is="icon" class="h-5 w-5" />
    </div>
    <p class="text-sm font-bold text-foreground">{{ title }}</p>
    <p v-if="description" class="mt-1.5 max-w-md text-[13.5px] leading-relaxed text-muted-foreground">{{ description }}</p>
    <div v-if="$slots.action" class="mt-5">
      <slot name="action" />
    </div>
  </div>
</template>
