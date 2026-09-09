<script setup lang="ts">
import { cn } from '@/lib/utils'

const props = defineProps<{
  label?: string
  disabled?: boolean
  id?: string
  class?: string
}>()

const model = defineModel<boolean>({ default: false })

function toggle() {
  if (props.disabled) return
  model.value = !model.value
}
</script>

<template>
  <div :class="cn('flex items-center gap-2.5', props.class)">
    <button
      :id="props.id"
      type="button"
      role="switch"
      :aria-checked="model"
      :aria-label="props.label"
      :disabled="props.disabled"
      class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-pill border-2 border-transparent transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
      :class="model ? 'bg-brand-deep' : 'bg-input'"
      @click="toggle"
    >
      <span
        class="pointer-events-none block h-4 w-4 rounded-full bg-white shadow-xs transition-transform"
        :class="model ? 'translate-x-4' : 'translate-x-0'"
      />
    </button>
    <label v-if="props.label" :for="props.id" class="select-none text-sm font-medium">
      {{ props.label }}
    </label>
  </div>
</template>
