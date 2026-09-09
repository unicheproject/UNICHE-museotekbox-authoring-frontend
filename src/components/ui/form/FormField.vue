<script setup lang="ts">
import { computed, useId } from 'vue'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/**
 * One labelled form control with its validation message directly beneath it. The slot receives the
 * generated `id` and an `invalid` flag so the control can wire up `aria-describedby` and the error
 * border without the page repeating the plumbing:
 *
 *   <FormField label="Name" :error="fieldErrors.name" v-slot="{ id, invalid }">
 *     <Input :id="id" v-model="name" :invalid="invalid" />
 *   </FormField>
 */
const props = defineProps<{
  label?: string
  /** Message for this field, typically `fieldErrors[name]` from `useMutation`. */
  error?: string | null
  hint?: string
  required?: boolean
  class?: string
}>()

const id = useId()
const errorId = computed(() => `${id}-error`)
const hintId = computed(() => `${id}-hint`)
const invalid = computed(() => Boolean(props.error))

const describedBy = computed(() => {
  const ids = [props.error ? errorId.value : null, props.hint ? hintId.value : null].filter(Boolean)
  return ids.length ? ids.join(' ') : undefined
})
</script>

<template>
  <div :class="cn('space-y-1.5', props.class)">
    <Label v-if="label" :for="id" :required="required">{{ label }}</Label>
    <slot :id="id" :invalid="invalid" :described-by="describedBy" />
    <p v-if="hint && !error" :id="hintId" class="text-xs text-muted-foreground">{{ hint }}</p>
    <p v-if="error" :id="errorId" role="alert" class="text-xs font-semibold text-destructive">
      {{ error }}
    </p>
  </div>
</template>
