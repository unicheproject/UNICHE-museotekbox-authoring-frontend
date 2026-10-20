<script setup lang="ts">
import type { FixRow } from '@/lib/authoring/engine'
import AIcon from './AIcon.vue'
import DialogShell from './DialogShell.vue'

/** Everything still missing, step by step; each line opens its step. */
defineProps<{ rows: FixRow[] }>()
const emit = defineEmits<{ close: []; step: [key: string]; link: [fromKey: string] }>()
</script>

<template>
  <DialogShell kicker="Before it goes out" :title="rows.length ? 'What still needs doing' : 'Ready'" @close="emit('close')">
    <div v-if="!rows.length" class="py-6 text-center">
      <span class="mx-auto flex h-12 w-12 items-center justify-center rounded-pill bg-success/10 text-success">
        <AIcon name="check" cls="h-6 w-6" />
      </span>
      <p class="mt-3 text-[14px] font-extrabold">Nothing to fix</p>
    </div>
    <div v-else class="divide-y divide-border rounded-md border border-border">
      <button
        v-for="(r, i) in rows"
        :key="i"
        type="button"
        class="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-2"
        @click="r.link ? emit('link', r.key) : emit('step', r.key)"
      >
        <span class="h-2 w-2 shrink-0 rounded-pill bg-warning" />
        <span class="min-w-0 flex-1">
          <span class="block text-[11px] font-bold uppercase tracking-overline text-muted-foreground">{{ r.where }}</span>
          <span class="block text-[13px]">{{ r.gap }}</span>
        </span>
        <span class="shrink-0 text-muted-foreground"><AIcon name="arrow" cls="h-4 w-4" /></span>
      </button>
    </div>
  </DialogShell>
</template>
