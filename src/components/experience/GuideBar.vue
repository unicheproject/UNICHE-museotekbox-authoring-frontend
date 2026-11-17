<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ArrowLeft, Check } from 'lucide-vue-next'
import { headBtnGrad } from './styles'

/**
 * The thin bar at the top of a page reached from the Dashboard's guide (`?guide=…` in the address):
 * which step this is, the way back, and once the step is done, the step after it. Pages reached any
 * other way never show it; the page decides that, and whether its step is done.
 *
 * The next step is a route (`nextTo`) or, for the display, a page in a new tab (`nextHref`).
 */
defineProps<{
  step: number
  title: string
  done: boolean
  nextLabel?: string
  nextTo?: string
  nextHref?: string
}>()
</script>

<template>
  <div
    class="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-4 py-2.5 text-[13px]"
    :class="done ? 'border-success/30 bg-emerald-50' : 'border-brand-deep/20 bg-brand-deep/[.04]'"
    role="status"
  >
    <p class="min-w-0 flex-1 basis-56">
      <template v-if="done">
        <span class="inline-flex items-center gap-1.5 font-extrabold text-success"><Check class="h-4 w-4" />Done.</span>
        <span v-if="nextLabel" class="font-semibold text-foreground"> Next: {{ nextLabel }}</span>
      </template>
      <template v-else>
        <span class="font-semibold text-muted-foreground">Get started · Step {{ step }} of 5:</span>
        <span class="font-extrabold text-brand-deep"> {{ title }}</span>
      </template>
    </p>
    <a v-if="done && nextHref" :href="nextHref" target="_blank" rel="noopener" :class="[headBtnGrad, '!py-1.5']">{{ nextLabel }}</a>
    <RouterLink v-else-if="done && nextTo" :to="nextTo" :class="[headBtnGrad, '!py-1.5']">{{ nextLabel }}</RouterLink>
    <RouterLink to="/" class="inline-flex items-center gap-1 font-bold text-brand-deep hover:underline">
      <ArrowLeft class="h-3.5 w-3.5" />Back to guide
    </RouterLink>
  </div>
</template>
