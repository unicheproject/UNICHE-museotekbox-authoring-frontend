<script setup lang="ts">
import { cn } from '@/lib/utils'

const props = defineProps<{
  rows?: number
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  id?: string
  class?: string
}>()

const model = defineModel<string>({ default: '' })
</script>

<template>
  <textarea
    :id="props.id"
    v-model="model"
    :rows="props.rows ?? 4"
    :placeholder="props.placeholder"
    :disabled="props.disabled"
    :aria-invalid="props.invalid || undefined"
    :class="
      cn(
        'flex w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        props.invalid && 'border-destructive focus-visible:ring-destructive',
        props.class,
      )
    "
  />
</template>
