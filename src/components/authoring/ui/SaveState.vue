<script setup lang="ts">
import AIcon from '../AIcon.vue'

/** Saving… or Saved, beside a page's title. */
defineProps<{ saving: boolean }>()
</script>

<template>
  <span class="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground" aria-live="polite">
    <template v-if="saving"><span class="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground/40 border-t-muted-foreground" />Saving…</template>
    <template v-else><AIcon name="check" cls="h-3.5 w-3.5 text-success" />Saved</template>
  </span>
</template>
