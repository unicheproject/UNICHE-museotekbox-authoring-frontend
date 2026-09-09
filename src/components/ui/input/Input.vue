<script setup lang="ts">
import { cn } from '@/lib/utils'

// Everything else (id, type, placeholder, disabled, aria-describedby) rides on attribute
// fallthrough; only `invalid` needs a prop because it changes the classes.
const props = defineProps<{ invalid?: boolean; class?: string }>()
const model = defineModel<string>()
</script>

<template>
  <input
    v-model="model"
    :aria-invalid="props.invalid || undefined"
    :class="
      cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        props.invalid && 'border-destructive focus-visible:ring-destructive',
        props.class,
      )
    "
  />
</template>
