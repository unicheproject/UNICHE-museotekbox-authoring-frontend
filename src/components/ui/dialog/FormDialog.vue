<script setup lang="ts">
import { nextTick, onUnmounted, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'

/**
 * A form inside a modal, for create and edit. The dialog owns the chrome — overlay, heading,
 * submit/cancel, form-level error — and the caller supplies the fields in the default slot and
 * handles `@submit`. Per-field messages belong on the fields themselves via `<FormField>`.
 *
 * Submission is driven by a real <form>, so Enter submits and the browser's own validation
 * (`required`, `pattern`) still applies before `@submit` fires.
 */
const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    description?: string
    submitLabel?: string
    cancelLabel?: string
    busy?: boolean
    /** Form-level error; field-level ones go on the fields. */
    error?: string | null
    /** Disables submit while the caller considers the form incomplete. */
    submitDisabled?: boolean
  }>(),
  {
    submitLabel: 'Save',
    cancelLabel: 'Cancel',
    busy: false,
    submitDisabled: false,
  },
)

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'submit'): void
  (e: 'cancel'): void
}>()

const panel = ref<HTMLElement | null>(null)

function close() {
  // A save in flight must not be abandoned half-way — the request would still land.
  if (props.busy) return
  emit('update:open', false)
  emit('cancel')
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

watch(
  () => props.open,
  async (open) => {
    if (!open) {
      window.removeEventListener('keydown', onKey)
      return
    }
    window.addEventListener('keydown', onKey)
    // Move focus into the dialog so keyboard users start at the first field, not behind the overlay.
    await nextTick()
    panel.value?.querySelector<HTMLElement>('input, select, textarea, button')?.focus()
  },
)

onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-black/50" @click="close" />
      <div
        ref="panel"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        class="relative z-10 w-full max-w-lg rounded-lg border bg-background shadow-lg"
      >
        <form novalidate @submit.prevent="emit('submit')">
          <div class="flex items-start justify-between gap-4 border-b px-6 py-4">
            <div>
              <h2 class="text-lg font-semibold">{{ title }}</h2>
              <p v-if="description" class="mt-1 text-sm text-muted-foreground">{{ description }}</p>
            </div>
            <button
              type="button"
              aria-label="Close"
              class="-mr-1 rounded-sm p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
              @click="close"
            >
              <X class="h-4 w-4" />
            </button>
          </div>

          <div class="space-y-4 px-6 py-5">
            <Alert v-if="error" variant="error">{{ error }}</Alert>
            <slot />
          </div>

          <div class="flex justify-end gap-2 border-t px-6 py-4">
            <Button type="button" variant="outline" :disabled="busy" @click="close">
              {{ cancelLabel }}
            </Button>
            <Button type="submit" :disabled="busy || submitDisabled">
              {{ busy ? 'Saving…' : submitLabel }}
            </Button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
