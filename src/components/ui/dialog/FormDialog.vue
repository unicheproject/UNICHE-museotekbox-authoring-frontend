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
    <!-- Same pattern as the authoring dialogs: centred, capped to the viewport, one scroll area (the
         fields), header and footer always visible. `dialog-overlay` locks the page underneath. -->
    <div v-if="open" class="dialog-overlay fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-10">
      <div class="fixed inset-0 bg-[#0b1020]/50 backdrop-blur-[2px]" @click="close" />
      <div
        ref="panel"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        class="dialog-in relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-lg bg-background shadow-2xl sm:max-h-[min(calc(100dvh-5rem),56rem)]"
      >
        <form novalidate class="flex min-h-0 flex-1 flex-col" @submit.prevent="emit('submit')">
          <div class="flex shrink-0 items-start gap-3 border-b border-border px-5 py-4 sm:px-7">
            <div class="min-w-0 flex-1">
              <h2 class="text-[17px] font-extrabold leading-tight">{{ title }}</h2>
              <p v-if="description" class="mt-1 text-[13px] leading-snug text-muted-foreground">{{ description }}</p>
            </div>
            <button
              type="button"
              title="Close"
              aria-label="Close"
              class="-mr-1.5 shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
              @click="close"
            >
              <X class="h-5 w-5" />
            </button>
          </div>

          <div class="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7 sm:py-6">
            <Alert v-if="error" variant="error">{{ error }}</Alert>
            <slot />
          </div>

          <div class="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border bg-background px-5 py-4 sm:px-7">
            <Button type="button" variant="outline" :disabled="busy" @click="close">
              {{ cancelLabel }}
            </Button>
            <Button type="submit" variant="gradient" :disabled="busy || submitDisabled">
              {{ busy ? 'Saving…' : submitLabel }}
            </Button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
