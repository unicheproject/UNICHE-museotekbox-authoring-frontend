<script setup lang="ts">
import { cn } from '@/lib/utils'
const props = defineProps<{ clickable?: boolean; class?: string }>()
</script>

<template>
  <tr
    :class="
      cn(
        'border-b border-border transition-colors',
        props.clickable && 'cursor-pointer hover:bg-secondary/60',
        props.class,
      )
    "
  >
    <slot />
  </tr>
</template>
