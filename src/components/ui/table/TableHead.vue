<script setup lang="ts">
import { cn } from '@/lib/utils'
const props = defineProps<{ class?: string }>()
</script>

<template>
  <!-- Styleguide "UI / Overline": 11px, 700, uppercase, wide tracking. -->
  <th
    scope="col"
    :class="
      cn(
        'px-4 py-3 text-left text-[11px] font-bold uppercase tracking-overline text-muted-foreground',
        props.class,
      )
    "
  >
    <slot />
  </th>
</template>
