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
    <!-- z-[70]: a confirm is often raised from inside another dialog (z-[60]) and must sit above it. -->
    <div v-if="open" class="dialog-overlay fixed inset-0 z-[70] flex items-center justify-center p-4">
      <!-- Backdrop: a click cancels (unless a confirm is in flight). -->
      <div class="fixed inset-0 bg-[#0b1020]/50 backdrop-blur-[2px]" @click="cancel" />
      <div
        role="alertdialog"
        aria-modal="true"
        :aria-label="title"
        class="dialog-in relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-lg bg-background shadow-2xl"
      >
        <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-2 pt-6">
          <h2 class="text-[17px] font-extrabold leading-tight">{{ title }}</h2>
          <p v-if="description" class="mt-2 text-[14px] leading-relaxed text-secondary-foreground">{{ description }}</p>
          <p v-if="error" role="alert" class="mt-4 rounded-md bg-destructive/[.06] px-3 py-2 text-[13px] font-bold text-destructive">{{ error }}</p>
        </div>
        <div class="flex shrink-0 flex-wrap justify-end gap-2 px-6 pb-6 pt-4">
          <Button variant="outline" :disabled="busy" @click="cancel">{{ cancelLabel }}</Button>
          <Button :variant="variant" :disabled="busy" @click="confirm">
            {{ busy ? 'Working…' : confirmLabel }}
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
