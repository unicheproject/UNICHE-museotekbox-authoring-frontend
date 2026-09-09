<script setup lang="ts">
import { cn } from '@/lib/utils'

const props = defineProps<{
  /** Marks the field as required — renders the styleguide's asterisk. */
  required?: boolean
  for?: string
  class?: string
}>()
</script>

<template>
  <label
    :for="props.for"
    :class="cn('block text-xs font-bold uppercase tracking-overline text-muted-foreground', props.class)"
  >
    <slot />
    <span v-if="required" aria-hidden="true" class="ml-0.5 text-destructive">*</span>
  </label>
</template>
