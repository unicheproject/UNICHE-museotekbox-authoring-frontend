<script setup lang="ts">
import { computed } from 'vue'
import type { CommentThreadDto } from '@/api/museotekBox'
import type { Authoring } from '@/lib/authoring/engine'
import { sceneName, stepName, type Comments } from '@/lib/authoring/useComments'
import AIcon from './AIcon.vue'
import CommentThread from './CommentThread.vue'

/**
 * The comments drawer: over the right side of the page, never pushing it down. Shows one step's
 * comments or all of them, grouped by screen; resolved threads are folded away at the bottom.
 */
const props = defineProps<{ a: Authoring; comments: Comments; step: string | null }>()
const emit = defineEmits<{ close: []; scope: [step: string | null] }>()

const list = computed(() => props.comments.threadsFor(props.step))
const open = computed(() => list.value.filter((t) => !t.resolved))
const done = computed(() => list.value.filter((t) => t.resolved))

const groups = computed(() => {
  const g = new Map<string, CommentThreadDto[]>()
  for (const t of open.value) {
    const k = `${t.stepKey}|${sceneName(props.a, t.sceneKey)}`
    if (!g.has(k)) g.set(k, [])
    g.get(k)!.push(t)
  }
  return [...g.values()]
})
</script>

<template>
  <aside
    aria-label="Comments"
    class="fixed inset-y-0 right-0 z-[35] flex w-[min(400px,100vw)] flex-col border-l border-border bg-white shadow-[-16px_0_40px_rgba(17,24,39,.16)]"
  >
    <div class="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
      <span class="flex items-center gap-2 text-[14px] font-extrabold">
        <span class="text-brand-deep"><AIcon name="chat" cls="h-4 w-4" /></span> Comments
      </span>
      <span class="flex items-center gap-1">
        <span class="inline-flex rounded-md bg-surface-2 p-0.5 text-[11px] font-bold">
          <button v-if="step" type="button" class="rounded bg-white px-2 py-1 text-brand-deep shadow-xs">
            {{ stepName(a, step) }}
          </button>
          <button
            type="button"
            class="rounded px-2 py-1"
            :class="step ? 'text-muted-foreground hover:text-brand-deep' : 'bg-white text-brand-deep shadow-xs'"
            @click="emit('scope', null)"
          >
            All · {{ comments.openThreads().length }}
          </button>
        </span>
        <button type="button" title="Close" class="rounded-sm p-1.5 text-muted-foreground hover:bg-surface-2" @click="emit('close')">
          <AIcon name="x" cls="h-4 w-4" />
        </button>
      </span>
    </div>

    <div class="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
      <template v-if="open.length">
        <div v-for="ts in groups" :key="ts[0].id">
          <div class="mb-1.5 truncate text-[10.5px] font-extrabold uppercase tracking-overline text-muted-foreground">
            {{ stepName(a, ts[0].stepKey) }} · “{{ sceneName(a, ts[0].sceneKey) }}”
          </div>
          <div class="space-y-2">
            <CommentThread
              v-for="t in ts"
              :key="t.id"
              :thread="t"
              :comments="comments"
              :scene-name="sceneName(a, t.sceneKey)"
              :show-scene="false"
            />
          </div>
        </div>
      </template>
      <p v-else class="rounded-md border border-dashed border-input p-4 text-center text-[12.5px] text-muted-foreground">
        No open comments{{ step ? ' on this step' : '' }}. Testers leave them from the test run.
      </p>

      <div v-if="done.length" class="border-t border-border pt-3">
        <button
          type="button"
          class="text-[12px] font-bold text-muted-foreground hover:text-brand-deep"
          @click="comments.ui.showResolved = !comments.ui.showResolved"
        >
          {{ comments.ui.showResolved ? 'Hide' : 'Show' }} {{ done.length }} resolved
        </button>
        <div v-if="comments.ui.showResolved" class="mt-2 space-y-2">
          <CommentThread v-for="t in done" :key="t.id" :thread="t" :comments="comments" :scene-name="sceneName(a, t.sceneKey)" />
        </div>
      </div>
    </div>
  </aside>
</template>
