<script setup lang="ts">
import { computed } from 'vue'
import { TEMPLATES } from '@/lib/authoring/engine'
import AIcon from './AIcon.vue'
import { toneOf } from '@/lib/authoring/tone'
import { dialogBody, dialogBox, dialogClose, dialogHead, dialogSub, dialogTitle, overlay } from './ui/styles'

/** Picking the activity to add, at a place in the visit. */
const props = defineProps<{ at: number; count: number }>()
const emit = defineEmits<{ close: []; pick: [templateId: string] }>()

const sub = computed(() =>
  props.at >= props.count
    ? props.count
      ? 'It goes in after the last activity, before the end.'
      : 'The first thing visitors do after the start.'
    : 'It goes in here, between the two steps.',
)
</script>

<template>
  <Teleport to="body">
    <div :class="overlay" @click.self="emit('close')">
      <div role="dialog" aria-modal="true" aria-label="Add an activity" :class="[dialogBox, 'max-w-3xl']">
        <div :class="dialogHead">
          <div class="min-w-0 flex-1">
            <h2 :class="dialogTitle">Add an activity</h2>
            <p :class="dialogSub">{{ sub }}</p>
          </div>
          <button type="button" title="Close" aria-label="Close" :class="dialogClose" @click="emit('close')">
            <AIcon name="x" cls="h-5 w-5" />
          </button>
        </div>
        <div :class="[dialogBody, 'grid content-start gap-3 sm:grid-cols-2']">
          <button
            v-for="t in TEMPLATES"
            :key="t.id"
            type="button"
            class="group flex items-start gap-4 rounded-lg border border-border p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand-deep hover:shadow-md"
            @click="emit('pick', t.id)"
          >
            <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" :style="{ color: toneOf(t.id)[0], background: toneOf(t.id)[1] }">
              <AIcon :name="t.icon" cls="h-6 w-6" />
            </span>
            <span>
              <span class="block text-[14px] font-extrabold">{{ t.name }}</span>
              <span class="mt-0.5 block text-[13px] leading-snug text-muted-foreground">{{ t.blurb }}</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
