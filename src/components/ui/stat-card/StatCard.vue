<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { Component } from 'vue'

/**
 * One cell of the dashboard's figure strip.
 *
 * It draws no border or shadow of its own: the four of them sit inside a single panel separated by
 * hairlines. As four separately-bordered cards they read as a stock admin template, and each one
 * carried a large empty area to the right of its number.
 *
 * `value` is `null` while the number is still being fetched, and stays a dash if the call failed —
 * a missing count is not worth an error banner on a home screen.
 */
defineProps<{
  label: string
  value: number | null
  icon?: Component
  to?: string
}>()
</script>

<template>
  <component
    :is="to ? RouterLink : 'div'"
    :to="to"
    class="flex flex-col gap-2 px-5 py-4 transition-colors"
    :class="to && 'hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring'"
  >
    <span class="flex items-center gap-2 text-muted-foreground">
      <component :is="icon" v-if="icon" class="h-3.5 w-3.5" />
      <span class="label-overline">{{ label }}</span>
    </span>
    <span class="text-[28px] font-extrabold leading-none tracking-[-0.02em] text-foreground">
      {{ value ?? '—' }}
    </span>
  </component>
</template>
