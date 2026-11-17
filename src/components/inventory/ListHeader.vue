<script setup lang="ts">
import { pageSubtitle, pageTitle, pill, pillTone } from '@/components/experience/styles'

/**
 * The heading of a list screen, the same as the Experiences screen's: title, the line under it
 * ("Test Museum · 7 scan objects") and the actions on the right; on a phone the actions sit under
 * the title. Every list screen and the Dashboard use it. `viewOnly` puts a quiet "View only" pill
 * where a manager's buttons would be.
 */
defineProps<{ title: string; subtitle?: string; viewOnly?: boolean }>()
</script>

<template>
  <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
    <div>
      <h1 :class="pageTitle">{{ title }}</h1>
      <p v-if="subtitle" :class="pageSubtitle">{{ subtitle }}</p>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <slot name="actions" />
      <span v-if="viewOnly" :class="[pill, pillTone.neutral]">View only</span>
    </div>
  </div>
</template>
