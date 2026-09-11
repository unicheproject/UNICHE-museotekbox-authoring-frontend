<script setup lang="ts">
import type { Component } from 'vue'

/**
 * One shape for "there is nothing here": a muted glyph, the name of what is missing, and at most
 * one action. The screens previously had four different versions of this — a dashed panel, a card
 * with two lines of prose, a table row, a bare paragraph.
 */
defineProps<{
  title: string
  icon?: Component
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center px-6 py-14 text-center">
    <div
      v-if="icon"
      class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-muted-foreground"
    >
      <component :is="icon" class="h-5 w-5" />
    </div>
    <p class="text-sm font-bold text-foreground">{{ title }}</p>
    <div v-if="$slots.action" class="mt-5">
      <slot name="action" />
    </div>
  </div>
</template>
