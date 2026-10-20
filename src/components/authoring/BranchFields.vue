<script setup lang="ts">
import { computed, ref } from 'vue'
import { LETTERS, answerHex, goOf, goTarget, itemId, itemLabel, or, usesScreen, type Authoring, type Cfg } from '@/lib/authoring/engine'
import AIcon from './AIcon.vue'
import DialogShell from './DialogShell.vue'
import MediaThumb from './MediaThumb.vue'
import ScreenPreview from './ScreenPreview.vue'

/**
 * Where the visitor goes after an answer on a ready-made screen: always on to the
 * next item, or a path per answer. Each answer shows the item it leads to, and "Change" picks
 * another in the "Go to" dialog: every other item of the quiz, and the end of it.
 */
const props = defineProps<{ a: Authoring; qs: Cfg[]; q: Cfg }>()
const emit = defineEmits<{ change: [] }>()

const answers = computed<Cfg[]>(() => props.q.answers || [])
const others = computed(() => props.qs.filter((o) => o !== props.q))

function setBranch(on: boolean) {
  props.q.branch = on
  emit('change')
}

/** The answer whose target is being chosen. */
const picking = ref<number | null>(null)
const current = computed(() => (picking.value == null ? null : goTarget(props.qs, props.q, goOf(props.q, picking.value))))

function choose(to: Cfg | null) {
  if (picking.value == null) return
  answers.value[picking.value].go = to ? itemId(to) : 'end'
  picking.value = null
  emit('change')
}

const firstShown = (o: Cfg) => ((o.display || [])[0] || {}) as Cfg
const tile = 'flex items-center gap-2.5 rounded-md border bg-white px-3 py-2.5 text-left text-[13px] font-bold transition-colors'
const on = 'border-brand-deep shadow-[0_0_0_1px_#4c1d8b] text-brand-deep'
const off = 'border-border hover:border-brand-deep'
</script>

<template>
  <div class="rounded-md border border-border p-4">
    <div class="mb-3 text-[12.5px] font-extrabold">Where does the visitor go next?</div>
    <div class="grid gap-2 sm:grid-cols-2">
      <button type="button" :class="[tile, q.branch ? off : on]" @click="setBranch(false)">
        <AIcon name="arrow" cls="h-4 w-4" />Always to the next question
      </button>
      <button type="button" :class="[tile, q.branch ? on : off]" @click="setBranch(true)">
        <AIcon name="route" cls="h-4 w-4" />It depends on the answer
      </button>
    </div>

    <div v-if="q.branch" class="mt-4 space-y-2">
      <button
        v-for="(ans, k) in answers"
        :key="k"
        type="button"
        class="flex w-full flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-border bg-white p-2.5 text-left hover:border-brand-deep sm:flex-nowrap"
        @click="picking = k"
      >
        <span class="flex min-w-0 basis-full items-center gap-2.5 sm:basis-[38%] sm:shrink-0">
          <span
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill text-[12.5px] font-extrabold text-white"
            :style="{ background: answerHex(a, ans) }"
            >{{ LETTERS[k] }}</span
          >
          <span class="truncate text-[13px] font-bold">{{ or(ans.text, 'Answer ' + LETTERS[k]) }}</span>
        </span>
        <AIcon name="arrow" cls="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
        <span class="flex min-w-0 flex-1 items-center gap-2.5">
          <template v-if="goTarget(qs, q, goOf(q, k))">
            <span v-if="usesScreen(a, goTarget(qs, q, goOf(q, k)))" class="w-14 shrink-0">
              <ScreenPreview :a="a" :s="goTarget(qs, q, goOf(q, k))!" sample />
            </span>
            <MediaThumb v-else :value="firstShown(goTarget(qs, q, goOf(q, k))!).name" kind="VISUAL" />
            <span class="min-w-0 flex-1">
              <span class="block text-[11.5px] font-bold text-muted-foreground">{{ itemLabel(qs, goTarget(qs, q, goOf(q, k))!) }}</span>
              <span class="block truncate text-[13px] font-bold">{{ or(goTarget(qs, q, goOf(q, k))!.name, 'Untitled question') }}</span>
            </span>
          </template>
          <template v-else>
            <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-surface-2 text-brand-deep">
              <AIcon name="flag" cls="h-4 w-4" />
            </span>
            <span class="min-w-0 flex-1 text-[13px] font-bold">End of the quiz</span>
          </template>
        </span>
        <span class="shrink-0 px-1 text-[12.5px] font-bold text-brand-deep">Change</span>
      </button>
    </div>

    <DialogShell
      v-if="picking != null"
      :kicker="'Answer ' + LETTERS[picking]"
      title="Go to"
      :foot="false"
      box-class="max-w-2xl"
      @close="picking = null"
    >
      <div class="space-y-2">
        <button
          v-for="(o, n) in others"
          :key="n"
          type="button"
          class="flex w-full items-center gap-3 rounded-md border p-2.5 text-left"
          :class="current === o ? 'border-brand-deep bg-brand-deep/[.06]' : 'border-border hover:border-brand-deep/50'"
          @click="choose(o)"
        >
          <span v-if="usesScreen(a, o)" class="w-20 shrink-0"><ScreenPreview :a="a" :s="o" sample /></span>
          <MediaThumb v-else :value="firstShown(o).name" kind="VISUAL" />
          <span class="min-w-0 flex-1">
            <span class="block text-[11.5px] font-bold text-muted-foreground">{{ itemLabel(qs, o) }}</span>
            <span class="block truncate text-[13px] font-bold">{{ or(o.name, 'Untitled question') }}</span>
          </span>
          <AIcon v-if="current === o" name="check" cls="h-4 w-4 shrink-0 text-brand-deep" />
        </button>
        <button
          type="button"
          class="flex w-full items-center gap-3 rounded-md border p-2.5 text-left"
          :class="current === null ? 'border-brand-deep bg-brand-deep/[.06]' : 'border-border hover:border-brand-deep/50'"
          @click="choose(null)"
        >
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-surface-2 text-brand-deep">
            <AIcon name="flag" cls="h-4 w-4" />
          </span>
          <span class="flex-1 text-[13px] font-bold">End of the quiz</span>
          <AIcon v-if="current === null" name="check" cls="h-4 w-4 shrink-0 text-brand-deep" />
        </button>
      </div>
    </DialogShell>
  </div>
</template>
