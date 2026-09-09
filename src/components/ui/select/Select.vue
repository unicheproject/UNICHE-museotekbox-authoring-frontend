<script setup lang="ts">
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-vue-next'

export interface SelectOption {
  value: string
  label: string
}

const props = defineProps<{
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  id?: string
  class?: string
}>()

// A native <select> on purpose: it is keyboard- and screen-reader-correct for free, and the
// styleguide asks for nothing a listbox could give us that the native control cannot.
const model = defineModel<string>({ default: '' })
</script>

<template>
  <div class="relative">
    <select
      :id="props.id"
      v-model="model"
      :disabled="props.disabled"
      :aria-invalid="props.invalid || undefined"
      :class="
        cn(
          'flex h-10 w-full appearance-none rounded-md border border-input bg-background pl-3 pr-9 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          props.invalid && 'border-destructive focus-visible:ring-destructive',
          props.class,
        )
      "
    >
      <option v-if="props.placeholder" value="" disabled>{{ props.placeholder }}</option>
      <option v-for="option in props.options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
    <ChevronDown
      class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
    />
  </div>
</template>
