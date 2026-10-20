<script setup lang="ts">
import { ICONS } from '@/lib/authoring/html'

/** One of the authoring icons, by name. */
defineProps<{ name: string; cls?: string }>()
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    :class="cls ?? 'h-4 w-4'"
    v-html="ICONS[name] || ''"
  />
</template>
