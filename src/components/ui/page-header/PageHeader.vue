<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'

/**
 * The one page heading in the app. Every screen used to draw its own — different heading sizes,
 * different back-link markup, different spacing below — so moving between screens read as moving
 * between three designs. Title, back link and the action row now come from here.
 *
 * `backTo` renders the link as a route; omitting it renders a button and emits `back`, which is
 * what a screen needs when "back" means the previous history entry rather than a fixed path.
 */
defineProps<{
  title: string
  backLabel?: string
  backTo?: string
}>()

defineEmits<{ (e: 'back'): void }>()

const backClass =
  'mb-2 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-overline text-muted-foreground transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
</script>

<template>
  <header class="mb-5">
    <RouterLink v-if="backLabel && backTo" :to="backTo" :class="backClass">
      <ArrowLeft class="h-3.5 w-3.5" />
      {{ backLabel }}
    </RouterLink>
    <button v-else-if="backLabel" type="button" :class="backClass" @click="$emit('back')">
      <ArrowLeft class="h-3.5 w-3.5" />
      {{ backLabel }}
    </button>

    <!-- Actions share the title's line rather than the block's baseline: with a status badge below
         the title, an end-aligned row dropped the primary action to the badge's height. -->
    <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <h1 class="min-w-0 truncate text-2xl font-extrabold tracking-[-0.02em] text-foreground">
        {{ title }}
      </h1>

      <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
        <slot name="actions" />
      </div>
    </div>

    <!-- Status badges and the like, on the line under the title: on a detail screen they belong to
         the heading, not to the first card. -->
    <div v-if="$slots.meta" class="mt-2 flex flex-wrap items-center gap-2">
      <slot name="meta" />
    </div>
  </header>
</template>
