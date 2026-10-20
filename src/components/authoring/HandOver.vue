<script setup lang="ts">
import AIcon from './AIcon.vue'

/** The line between two steps: what it takes to move on — and a + to add an activity there. */
defineProps<{ short: string; warn: boolean; last: boolean }>()
const emit = defineEmits<{ link: []; add: [] }>()

const line = 'mx-auto w-0.5 shrink-0 bg-brand-deep/[.22]'
</script>

<template>
  <div class="flex flex-col items-center">
    <div :class="line" style="height: 12px" />
    <button
      type="button"
      title="Change how the visitor moves on"
      class="flex items-center gap-1.5 rounded-pill border bg-white px-3 py-1 text-[11.5px] font-bold hover:border-brand-deep hover:text-brand-deep"
      :class="warn ? 'border-warning/60 text-warning' : 'border-border text-secondary-foreground'"
      @click="emit('link')"
    >
      <AIcon name="timer" cls="h-3 w-3" />
      <span v-html="short" />
    </button>
    <div :class="line" :style="{ height: last ? '12px' : '8px' }" />
    <button
      v-if="last"
      type="button"
      class="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-brand-deep/35 bg-white px-4 py-3.5 text-[13.5px] font-extrabold text-brand-deep hover:border-brand-deep hover:bg-brand-deep/[.03]"
      @click="emit('add')"
    >
      <AIcon name="plus" cls="h-4 w-4" /> Add an activity
    </button>
    <button
      v-else
      type="button"
      title="Add an activity here"
      class="flex h-6 w-6 items-center justify-center rounded-pill border border-dashed border-brand-deep/40 bg-white text-brand-deep hover:border-brand-deep hover:bg-brand-deep hover:text-white"
      @click="emit('add')"
    >
      <AIcon name="plus" cls="h-3 w-3" />
    </button>
    <div :class="line" style="height: 12px" />
  </div>
</template>
