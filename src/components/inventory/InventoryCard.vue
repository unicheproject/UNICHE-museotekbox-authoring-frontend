<script setup lang="ts">
import type { Component } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowRight } from 'lucide-vue-next'
import { cardBox, cardOpen, coverFallback } from '@/components/experience/styles'

/**
 * A card for a thing the museum owns (a scan object, a Box), built like the experience card: the
 * same box and hover, a cover band where the experience card has its picture (here an icon, on the
 * brand gradient or on the object's own colour), the name, a line under it, the pills, and "Open".
 */
defineProps<{
  to: string
  title: string
  subtitle?: string
  icon: Component
  /** The band's colour (a coloured card's own); the brand gradient when absent. */
  colour?: string | null
  /** Draw the icon dark: for a light band colour (a white card). */
  darkIcon?: boolean
  /**
   * A lower band, and a soft brand tint instead of the gradient when there is no colour of its own,
   * so a grid of icon bands stays quieter than the experience covers it sits beside.
   */
  compact?: boolean
}>()
</script>

<template>
  <RouterLink :to="to" :class="['group flex flex-col overflow-hidden', cardBox]">
    <span
      class="flex items-center justify-center"
      :class="[
        compact ? 'h-16' : 'h-24',
        colour ? 'border-b border-border' : compact ? 'border-b border-border bg-brand-deep/[.06]' : coverFallback,
      ]"
      :style="colour ? { background: colour } : undefined"
    >
      <component
        :is="icon"
        :class="[
          compact ? 'h-7 w-7' : 'h-9 w-9',
          darkIcon ? 'text-foreground/70' : !colour && compact ? 'text-brand-deep' : 'text-white',
        ]"
      />
    </span>
    <span class="flex flex-1 flex-col p-4">
      <span class="line-clamp-2 text-[15px] font-bold leading-snug">{{ title }}</span>
      <span v-if="subtitle" class="mt-1 text-[12.5px] text-muted-foreground">{{ subtitle }}</span>
      <span class="flex-1" />
      <span class="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
        <span class="inline-flex flex-wrap items-center gap-1.5"><slot name="pills" /></span>
        <span :class="cardOpen">Open<ArrowRight class="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></span>
      </span>
    </span>
  </RouterLink>
</template>
