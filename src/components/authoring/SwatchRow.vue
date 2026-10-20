<script setup lang="ts">
import { COLORS } from '@/lib/authoring/engine'

/** A closed palette of six named colours instead of a colour picker. */
defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [color: string] }>()
</script>

<template>
  <span class="flex flex-wrap gap-1.5">
    <button
      v-for="c in COLORS"
      :key="c.id"
      type="button"
      :title="c.name"
      class="h-7 w-7 rounded-pill border-2 transition-transform hover:scale-110"
      :class="modelValue === c.id ? 'border-brand-deep ring-2 ring-brand-deep/25' : 'border-white'"
      :style="{ background: c.hex }"
      @click="emit('update:modelValue', c.id)"
    />
  </span>
</template>
