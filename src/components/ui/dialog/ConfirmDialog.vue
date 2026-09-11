<script setup lang="ts">
import { watch, onUnmounted } from 'vue'
import { Button } from '@/components/ui/button'
import type { ButtonVariants } from '@/components/ui/button'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    description?: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: ButtonVariants['variant']
    busy?: boolean
    error?: string | null
  }>(),
  {
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    variant: 'destructive',
    busy: false,
  },
)

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

function cancel() {
  if (props.busy) return
  emit('update:open', false)
  emit('cancel')
}

function confirm() {
  emit('confirm')
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') cancel()
}

watch(
  () => props.open,
  (open) => {
    if (open) window.addEventListener('keydown', onKey)
    else window.removeEventListener('keydown', onKey)
  },
)

onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <!-- Backdrop: a click cancels (unless a confirm is in flight). -->
      <div class="fixed inset-0 bg-black/50" @click="cancel" />
      <div
        role="alertdialog"
        aria-modal="true"
        :aria-label="title"
        class="relative z-10 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg"
      >
        <h2 class="text-lg font-extrabold tracking-[-0.01em]">{{ title }}</h2>
        <p v-if="description" class="mt-2 text-sm text-muted-foreground">{{ description }}</p>
        <p v-if="error" role="alert" class="mt-4 text-sm text-destructive">{{ error }}</p>
        <div class="mt-6 flex justify-end gap-2">
          <Button variant="outline" :disabled="busy" @click="cancel">{{ cancelLabel }}</Button>
          <Button :variant="variant" :disabled="busy" @click="confirm">
            {{ busy ? 'Working…' : confirmLabel }}
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
