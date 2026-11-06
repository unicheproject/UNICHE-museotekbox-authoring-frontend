<script setup lang="ts">
import { computed } from 'vue'
import type { CommentThreadDto } from '@/api/museotekBox'
import AIcon from '../AIcon.vue'

/**
 * On a step's own page: one slim bar saying how many open comments the step has and who spoke last.
 * The comments themselves are on the Comments page, filtered to this step.
 */
const props = defineProps<{ open: CommentThreadDto[] }>()
const emit = defineEmits<{ view: [] }>()

const latest = computed(() => [...props.open].sort((x, y) => y.createdAt.localeCompare(x.createdAt))[0])
</script>

<template>
  <button
    v-if="latest"
    type="button"
    class="flex w-full items-center gap-3 rounded-lg border border-brand-deep/20 bg-brand-deep/[.04] px-4 py-3 text-left transition-colors hover:border-brand-deep hover:bg-brand-deep/[.07]"
    @click="emit('view')"
  >
    <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-deep/10 text-brand-deep"><AIcon name="chat" /></span>
    <span class="min-w-0 flex-1">
      <span class="block text-[13.5px] font-extrabold">{{ open.length }} open comment{{ open.length === 1 ? '' : 's' }} on this step</span>
      <span class="block truncate text-[12.5px] text-secondary-foreground">Latest: <b>{{ latest.authorName }}</b> · “{{ latest.body }}”</span>
    </span>
    <span class="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-bold text-brand-deep">View<AIcon name="arrow" cls="h-3.5 w-3.5" /></span>
  </button>
</template>
