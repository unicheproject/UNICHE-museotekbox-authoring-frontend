<script setup lang="ts">
import { computed } from 'vue'
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
 *
 * A zero reads "None yet" instead of a big 0, with an optional small link to make the first one
 * (`addLabel` / `addTo`, given only to someone allowed to). `note` sits beside the number, e.g.
 * "(you)".
 */
const props = defineProps<{
  label: string
  value: number | null
  icon?: Component
  to?: string
  note?: string
  addLabel?: string
  addTo?: string
}>()

const none = computed(() => props.value === 0)
/** The whole cell is a link, except when it holds its own "+ New…" link (no link inside a link). */
const asLink = computed(() => !!props.to && !(none.value && props.addTo))
</script>

<template>
  <component
    :is="asLink ? RouterLink : 'div'"
    :to="asLink ? to : undefined"
    class="flex flex-col gap-2 px-5 py-4 transition-colors"
    :class="asLink && 'hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring'"
  >
    <span class="flex items-center gap-2 text-muted-foreground">
      <component :is="icon" v-if="icon" class="h-3.5 w-3.5" />
      <span class="label-overline">{{ label }}</span>
    </span>
    <!-- "None yet", and the link always on its own line under it, the same in every cell. -->
    <span v-if="none" class="flex min-h-[28px] flex-col items-start gap-0.5">
      <span class="text-[15px] font-bold text-muted-foreground">None yet</span>
      <RouterLink v-if="addTo && addLabel" :to="addTo" class="text-[13px] font-bold text-brand-deep hover:underline">+ {{ addLabel }}</RouterLink>
    </span>
    <span v-else class="flex items-baseline gap-2">
      <span class="text-[28px] font-extrabold leading-none tracking-[-0.02em] text-foreground">{{ value ?? '—' }}</span>
      <span v-if="note && value !== null" class="text-[13px] font-semibold text-muted-foreground">{{ note }}</span>
    </span>
  </component>
</template>
