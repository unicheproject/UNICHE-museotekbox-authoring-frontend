<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { btnPrimary } from '@/lib/authoring/html'
import AIcon from './AIcon.vue'

/** A dialog over the page: a kicker and a title, the body, and a Done button. */
withDefaults(defineProps<{ kicker: string; title: string; sub?: string; foot?: boolean; boxClass?: string }>(), {
  sub: '',
  foot: true,
  boxClass: 'max-w-[62rem]',
})
const emit = defineEmits<{ close: [] }>()

// The page underneath does not scroll while a dialog is open.
onMounted(() => (document.body.style.overflow = 'hidden'))
onUnmounted(() => (document.body.style.overflow = ''))
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-40 flex items-start justify-center px-6 py-10">
      <div class="absolute inset-0 bg-[rgba(17,24,39,.55)]" @click="emit('close')" />
      <div
        role="dialog"
        aria-modal="true"
        class="relative flex max-h-full w-full flex-col rounded-[.75rem] bg-white shadow-[0_20px_50px_rgba(17,24,39,.35)]"
        :class="boxClass"
      >
        <div class="flex items-start justify-between gap-3 border-b border-border px-8 py-5">
          <div class="min-w-0">
            <div class="text-[10px] font-extrabold uppercase tracking-overline text-muted-foreground">{{ kicker }}</div>
            <div class="text-[17px] font-extrabold leading-tight" v-html="title" />
            <div v-if="sub" class="mt-1 text-[12.5px] text-secondary-foreground">{{ sub }}</div>
          </div>
          <button type="button" title="Close" class="rounded-sm p-1.5 text-muted-foreground hover:bg-surface-2" @click="emit('close')">
            <AIcon name="x" cls="h-4 w-4" />
          </button>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto px-8 py-7"><slot /></div>
        <div v-if="foot" class="flex justify-end border-t border-border px-8 py-4">
          <button type="button" :class="btnPrimary" @click="emit('close')">Done</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
