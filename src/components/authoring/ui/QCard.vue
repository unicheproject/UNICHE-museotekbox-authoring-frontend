<script setup lang="ts">
/**
 * One question of a step's page, in its own white card: a quiet numbered circle (amber while something
 * here is missing), the question, and what answers it (the default slot).
 */
defineProps<{ n: number; title: string; optional?: boolean; miss?: boolean; id?: string }>()
</script>

<template>
  <section :id="id ? `f-${id}` : undefined" :data-miss="miss || undefined" class="scroll-mt-6 rounded-lg border bg-white p-5 shadow-xs sm:p-6" :class="miss ? 'border-warning/25' : 'border-transparent'">
    <div class="mb-5 flex items-start gap-3.5">
      <span
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13.5px] font-extrabold"
        :class="miss ? 'bg-warning/10 text-warning ring-1 ring-warning/40' : 'bg-brand-deep/[.08] text-brand-deep'"
      >
        {{ n }}
      </span>
      <h2 class="pt-1.5 text-[15px] font-semibold leading-snug">
        <slot name="title">{{ title }}</slot>
        <span v-if="optional" class="text-[13.5px] font-semibold text-muted-foreground"> (optional)</span>
      </h2>
    </div>
    <slot />
  </section>
</template>
