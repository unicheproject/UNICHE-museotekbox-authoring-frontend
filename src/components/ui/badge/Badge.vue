<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'
import { badgeVariants, type BadgeVariants } from '.'

const props = defineProps<{
  variant?: BadgeVariants['variant']
  /** Renders the styleguide's leading dot (`.badge-dot`). */
  dot?: boolean
  class?: string
}>()

const classes = computed(() => cn(badgeVariants({ variant: props.variant }), props.class))
</script>

<template>
  <span :class="classes">
    <span v-if="dot" class="h-1.5 w-1.5 rounded-full bg-current" />
    <slot />
  </span>
</template>
