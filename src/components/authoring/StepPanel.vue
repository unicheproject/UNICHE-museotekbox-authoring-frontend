<script setup lang="ts">
import { computed } from 'vue'
import AIcon from './AIcon.vue'

/**
 * A step in the panel beside the flow: how the visitor comes in (`inPhrase`), the step itself (the
 * default slot), and how they go on (`outPhrase`). Phrases may carry markup. An activity can also be
 * moved and removed; the Start and End cannot.
 */
const props = defineProps<{
  glyph: string
  kicker: string
  title: string
  inPhrase?: string
  outPhrase?: string
  gaps: string[]
  movable?: boolean
  first?: boolean
  last?: boolean
}>()
const emit = defineEmits<{ close: []; linkIn: []; linkOut: []; up: []; down: []; remove: [] }>()

/** What is left to do, counted once per kind: "No right object chosen ×3". */
const counted = computed(() => {
  const counts = new Map<string, number>()
  for (const g of props.gaps) counts.set(g, (counts.get(g) || 0) + 1)
  return [...counts]
})

const handCls = 'flex w-full items-center gap-2 px-6 py-2.5 text-left text-[12.5px] text-secondary-foreground hover:bg-surface-2'
const iconBtn = 'rounded-sm p-1.5 hover:bg-surface-2 hover:text-brand-deep'
</script>

<template>
  <section class="min-w-0 scroll-mt-4 rounded-lg border border-border bg-white shadow-xs" :aria-label="title">
    <div class="flex items-start justify-between gap-3 border-b border-border px-6 py-4">
      <div class="flex min-w-0 items-center gap-3">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-surface-2 text-brand-deep">
          <AIcon :name="glyph" cls="h-5 w-5" />
        </span>
        <div class="min-w-0">
          <div class="text-[10px] font-extrabold uppercase tracking-overline text-muted-foreground">{{ kicker }}</div>
          <div class="text-[19px] font-extrabold leading-tight">{{ title }}</div>
        </div>
      </div>
      <span v-if="movable" class="flex shrink-0 items-center text-muted-foreground">
        <button type="button" :disabled="first" title="Earlier in the visit" :class="[iconBtn, 'disabled:opacity-25']" @click="emit('up')">
          <AIcon name="arrow" cls="h-4 w-4 -rotate-90" />
        </button>
        <button type="button" :disabled="last" title="Later in the visit" :class="[iconBtn, 'disabled:opacity-25']" @click="emit('down')">
          <AIcon name="arrow" cls="h-4 w-4 rotate-90" />
        </button>
        <button type="button" title="Remove this activity" class="rounded-sm p-1.5 hover:bg-surface-2 hover:text-destructive" @click="emit('remove')">
          <AIcon name="trash" cls="h-4 w-4" />
        </button>
        <span class="mx-1 h-5 w-px bg-border" />
        <button type="button" title="Close" :class="iconBtn" @click="emit('close')">
          <AIcon name="x" cls="h-5 w-5" />
        </button>
      </span>
      <button
        v-else
        type="button"
        title="Close"
        class="rounded-sm p-1.5 text-muted-foreground hover:bg-surface-2 hover:text-brand-deep"
        @click="emit('close')"
      >
        <AIcon name="x" cls="h-5 w-5" />
      </button>
    </div>

    <div v-if="inPhrase" class="border-b border-border">
      <button type="button" :class="handCls" @click="emit('linkIn')">
        <AIcon name="timer" cls="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span class="min-w-0 flex-1" v-html="inPhrase" />
        <span class="shrink-0 text-[11.5px] font-bold text-brand-deep">Change</span>
      </button>
    </div>

    <div
      v-if="gaps.length"
      class="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-warning/[.06] px-6 py-2.5 text-[12px] text-warning"
    >
      <b class="font-extrabold">{{ gaps.length }} to fix</b>
      <template v-for="([g, n], k) in counted" :key="g">
        <span v-if="k" class="opacity-40">·</span>
        <span>{{ g }}<b v-if="n > 1"> ×{{ n }}</b></span>
      </template>
    </div>

    <div class="p-6"><slot /></div>

    <div v-if="outPhrase" class="border-t border-border">
      <button type="button" :class="handCls" @click="emit('linkOut')">
        <AIcon name="timer" cls="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span class="min-w-0 flex-1" v-html="outPhrase" />
        <span class="shrink-0 text-[11.5px] font-bold text-brand-deep">Change</span>
      </button>
    </div>
  </section>
</template>
