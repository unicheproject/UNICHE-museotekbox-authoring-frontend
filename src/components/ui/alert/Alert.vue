<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, CheckCircle2, Info, XCircle, X } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import { alertVariants, type AlertVariants } from '.'

const props = defineProps<{
  variant?: AlertVariants['variant']
  title?: string
  /** Shows a close button and emits `dismiss` when clicked. */
  dismissible?: boolean
  class?: string
}>()

const emit = defineEmits<{ (e: 'dismiss'): void }>()

const icons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
} as const

const icon = computed(() => icons[props.variant ?? 'info'])

// Errors must reach assistive tech immediately; the rest are polite status updates.
const role = computed(() => (props.variant === 'error' ? 'alert' : 'status'))
</script>

<template>
  <div :role="role" :class="cn(alertVariants({ variant: props.variant }), props.class)">
    <component :is="icon" class="mt-px h-4 w-4 shrink-0" />
    <div class="min-w-0 flex-1">
      <p v-if="props.title" class="text-sm font-bold">{{ props.title }}</p>
      <div class="text-sm [&:not(:first-child)]:mt-0.5">
        <slot />
      </div>
    </div>
    <button
      v-if="props.dismissible"
      type="button"
      aria-label="Dismiss"
      class="-mr-1 -mt-1 shrink-0 rounded-sm p-1 opacity-60 transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-current"
      @click="emit('dismiss')"
    >
      <X class="h-3.5 w-3.5" />
    </button>
  </div>
</template>
