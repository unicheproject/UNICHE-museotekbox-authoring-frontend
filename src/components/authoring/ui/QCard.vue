<script setup lang="ts">
/**
 * One question of a step's page, in its own white card: a numbered circle (amber while something
 * here is missing), the question, and what answers it (the default slot).
 */
defineProps<{ n: number; title: string; optional?: boolean; miss?: boolean; id?: string }>()
</script>

<template>
  <section :id="id ? `f-${id}` : undefined" class="scroll-mt-6 rounded-lg border bg-white p-5 shadow-xs" :class="miss ? 'border-amber-300' : 'border-transparent'">
    <div class="mb-5 flex items-start gap-3.5">
      <span
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13.5px] font-extrabold"
        :class="miss ? 'bg-amber-100 text-warning' : 'bg-brand-deep text-white'"
      >
        {{ n }}
      </span>
      <h2 class="pt-1 text-[15px] font-extrabold leading-snug">
        <slot name="title">{{ title }}</slot>
        <span v-if="optional" class="text-[13.5px] font-semibold text-muted-foreground"> (optional)</span>
      </h2>
    </div>
    <slot />
  </section>
</template>
