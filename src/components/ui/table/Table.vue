<script setup lang="ts">
import { cn } from '@/lib/utils'
const props = defineProps<{ class?: string }>()
</script>

<template>
  <!-- The wrapper owns the horizontal scroll so a wide table never widens the page. -->
  <div class="w-full overflow-x-auto rounded-lg border bg-card">
    <table :class="cn('w-full caption-bottom border-collapse text-sm', props.class)">
      <slot />
    </table>
  </div>
</template>
