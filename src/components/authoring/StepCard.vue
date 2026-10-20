<script setup lang="ts">
import AIcon from './AIcon.vue'

/**
 * One step of the visit in the flow: the Start, an activity, or the End. `line` may carry markup.
 * `comments` is how many open comments are about the step, shown as a small speech bubble.
 */
defineProps<{ glyph: string; title: string; line: string; gaps: number; selected: boolean; large?: boolean; comments?: number }>()
const emit = defineEmits<{ open: []; comments: [] }>()
</script>

<template>
  <button
    type="button"
    :aria-current="selected ? 'true' : undefined"
    class="flex w-full items-center gap-3.5 rounded-lg border bg-white text-left transition-colors"
    :class="[
      large ? 'p-4' : 'px-4 py-3',
      selected
        ? 'border-brand-deep shadow-[0_0_0_1px_#4c1d8b,0_0_0_5px_rgb(76_29_139/.12)]'
        : 'border-border shadow-xs hover:border-brand-deep',
    ]"
    @click="emit('open')"
  >
    <span
      class="flex shrink-0 items-center justify-center rounded-pill bg-surface-2 text-brand-deep"
      :class="large ? 'h-10 w-10' : 'h-8 w-8'"
    >
      <AIcon :name="glyph" :cls="large ? 'h-5 w-5' : 'h-4 w-4'" />
    </span>
    <span class="min-w-0 flex-1">
      <span class="block font-extrabold" :class="large ? 'text-[15px]' : 'text-[13.5px]'">{{ title }}</span>
      <span v-if="line" class="mt-0.5 block text-[12.5px] leading-snug text-muted-foreground" v-html="line" />
    </span>
    <span
      v-if="comments"
      :title="`${comments} open comment${comments === 1 ? '' : 's'}`"
      class="flex shrink-0 items-center gap-1 rounded-pill bg-brand-deep/[.08] px-2 py-0.5 text-[11px] font-bold text-brand-deep hover:bg-brand-deep hover:text-white"
      @click.stop="emit('comments')"
    >
      <AIcon name="chat" cls="h-3 w-3" />{{ comments }}
    </span>
    <span v-if="gaps" class="shrink-0 rounded-pill bg-warning/10 px-2 py-0.5 text-[10.5px] font-extrabold text-warning">
      {{ gaps }} to fix
    </span>
    <span class="shrink-0" :class="selected ? 'text-brand-deep' : 'text-muted-foreground'">
      <AIcon name="arrow" cls="h-4 w-4" />
    </span>
  </button>
</template>
