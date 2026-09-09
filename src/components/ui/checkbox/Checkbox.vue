<script setup lang="ts">
import { useId } from 'vue'
import { Check } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

const props = defineProps<{
  label?: string
  description?: string
  disabled?: boolean
  id?: string
  class?: string
}>()

const model = defineModel<boolean>({ default: false })

// The real <input> stays in the DOM (sr-only) so it keeps native semantics and focus handling;
// the visible box is a sibling driven by :checked / :focus-visible via peer-* classes.
const fallbackId = useId()
const inputId = props.id ?? fallbackId
</script>

<template>
  <div :class="cn('flex items-start gap-2.5', props.class)">
    <span class="relative flex h-5 items-center">
      <input
        :id="inputId"
        v-model="model"
        type="checkbox"
        :disabled="props.disabled"
        class="peer sr-only"
      />
      <span
        aria-hidden="true"
        class="flex h-4 w-4 items-center justify-center rounded-sm border border-input bg-background text-white transition-colors peer-checked:border-brand-deep peer-checked:bg-brand-deep peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-1 peer-disabled:opacity-50"
      >
        <Check v-if="model" class="h-3 w-3" stroke-width="3" />
      </span>
    </span>
    <label v-if="props.label || props.description" :for="inputId" class="cursor-pointer select-none">
      <span v-if="props.label" class="block text-sm font-medium leading-5">{{ props.label }}</span>
      <span v-if="props.description" class="block text-xs text-muted-foreground">
        {{ props.description }}
      </span>
    </label>
    <slot />
  </div>
</template>
