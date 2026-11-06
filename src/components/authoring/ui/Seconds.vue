<script setup lang="ts">
import { bigInput } from './styles'

/** A number of seconds. */
defineProps<{ modelValue: number | string | null | undefined }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <div class="flex items-center gap-3">
    <input
      type="number"
      min="1"
      :value="modelValue ?? ''"
      placeholder="—"
      :class="[bigInput, '!w-32']"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <span class="text-[14px]">seconds</span>
  </div>
</template>
