<script setup lang="ts">
import { computed } from 'vue'
import { TEMPLATES } from '@/lib/authoring/engine'
import AIcon from './AIcon.vue'
import DialogShell from './DialogShell.vue'

/** Picking the activity to add, at a place in the visit. */
const props = defineProps<{ at: number; count: number }>()
const emit = defineEmits<{ close: []; pick: [templateId: string] }>()

const sub = computed(() =>
  props.at >= props.count
    ? props.count
      ? 'It goes in after the last activity, before the end.'
      : 'The first thing the visitor does after the welcome.'
    : 'It goes in here, between the two steps.',
)
</script>

<template>
  <DialogShell kicker="New activity" title="Add an activity" :sub="sub" :foot="false" @close="emit('close')">
    <div class="grid gap-3 sm:grid-cols-2">
      <button
        v-for="t in TEMPLATES"
        :key="t.id"
        type="button"
        class="flex items-start gap-3 rounded-md border-2 border-border p-4 text-left transition-colors hover:border-brand-deep hover:bg-brand-deep/[.03]"
        @click="emit('pick', t.id)"
      >
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-2 text-brand-deep">
          <AIcon :name="t.icon" cls="h-4 w-4" />
        </span>
        <span>
          <span class="block text-[14px] font-extrabold">{{ t.name }}</span>
          <span class="mt-0.5 block text-[12px] leading-snug text-muted-foreground">{{ t.blurb }}</span>
        </span>
      </button>
    </div>
  </DialogShell>
</template>
