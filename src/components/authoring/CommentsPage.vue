<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { CommentThreadDto } from '@/api/museotekBox'
import type { Authoring } from '@/lib/authoring/engine'
import { stepGlyph, stepKeys, stepTitle, stepTone } from '@/lib/authoring/tone'
import { sceneName, type Comments } from '@/lib/authoring/useComments'
import AIcon from './AIcon.vue'
import CommentThread from './CommentThread.vue'
import Crumbs from './ui/Crumbs.vue'
import { btnDeep } from './ui/styles'

/**
 * Every comment on the experience. Open or Resolved, narrowed by step and by a search over the
 * words and who wrote them; grouped by step, newest first, a few at a time.
 */
const props = defineProps<{ a: Authoring; comments: Comments; step: string | null; base: string }>()
const router = useRouter()

const tab = ref<'open' | 'done'>('open')
const query = ref('')
const GROUP_FIRST = 5
const PAGE = 10
const shown = ref<Record<string, number>>({})

const all = computed(() => props.comments.threads.value)
const nOpen = computed(() => all.value.filter((t) => !t.resolved).length)
const nDone = computed(() => all.value.length - nOpen.value)
const matches = (t: CommentThreadDto, q: string) =>
  !q || [t.body, t.authorName, ...t.replies.flatMap((r) => [r.body, r.authorName])].some((x) => x.toLowerCase().includes(q))
const found = computed(() => {
  const q = query.value.trim().toLowerCase()
  return all.value.filter((t) => (tab.value === 'open') !== t.resolved && matches(t, q))
})
/** A comment about a step that no longer exists is shown under the visit's first step. */
const stepOf = (t: CommentThreadDto) => (t.stepKey && stepKeys(props.a).includes(t.stepKey) ? t.stepKey : 'start')
const per = (k: string) => found.value.filter((t) => stepOf(t) === k).length
const chips = computed(() => [
  { key: '', text: `All steps · ${found.value.length}` },
  ...stepKeys(props.a)
    .filter((k) => per(k))
    .map((k) => ({ key: k, text: `${stepTitle(props.a, k)} · ${per(k)}` })),
])
const first = computed(() => (props.step ? PAGE : GROUP_FIRST))
const groups = computed(() =>
  stepKeys(props.a)
    .filter((k) => !props.step || k === props.step)
    .map((k) => ({ k, ts: found.value.filter((t) => stepOf(t) === k).sort((x, y) => y.createdAt.localeCompare(x.createdAt)) }))
    .filter((g) => g.ts.length),
)
const count = (k: string) => shown.value[`${tab.value}:${k}`] ?? first.value
const more = (k: string) => (shown.value[`${tab.value}:${k}`] = count(k) + PAGE)
</script>

<template>
  <div class="mx-auto max-w-[760px] min-[1700px]:max-w-[1100px]">
    <Crumbs
      :parts="
        step
          ? [{ text: 'Experiences', to: '/experiences' }, { text: a.details.name || 'Untitled experience', to: base }, { text: stepTitle(a, step), to: `${base}/step/${step}` }, { text: 'Comments' }]
          : [{ text: 'Experiences', to: '/experiences' }, { text: a.details.name || 'Untitled experience', to: base }, { text: 'Comments' }]
      "
    />
    <h1 class="text-2xl font-extrabold tracking-tight">Comments</h1>
    <p class="mb-5 mt-0.5 text-[13px] text-muted-foreground">Left by people trying the experience, on the screen they were looking at.</p>

    <div class="mb-3 flex flex-wrap items-center gap-2.5">
      <span class="inline-flex rounded-md bg-surface-2 p-0.5 text-[12.5px] font-bold">
        <button
          v-for="[k, t, n] in ([['open', 'Open', nOpen], ['done', 'Resolved', nDone]] as const)"
          :key="k"
          type="button"
          class="rounded px-3 py-1.5"
          :class="tab === k ? 'bg-white text-brand-deep shadow-xs' : 'text-muted-foreground hover:text-brand-deep'"
          @click="tab = k"
        >
          {{ t }} · {{ n }}
        </button>
      </span>
      <label class="relative min-w-[200px] flex-1">
        <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><AIcon name="search" /></span>
        <input
          v-model="query"
          type="search"
          placeholder="Search comments or people…"
          class="w-full rounded-md border border-input bg-white py-2 pl-9 pr-3 text-[13.5px] outline-none focus:border-brand-deep focus:ring-2 focus:ring-brand-deep/20"
        />
      </label>
    </div>
    <div class="mb-5 flex flex-wrap gap-1.5">
      <button
        v-for="c in chips"
        :key="c.key"
        type="button"
        class="rounded-pill px-3 py-1.5 text-[12.5px] font-bold"
        :class="(step || '') === c.key ? 'bg-brand-deep text-white' : 'bg-white text-secondary-foreground ring-1 ring-border hover:ring-brand-deep'"
        @click="router.push(c.key ? `${base}/comments/${c.key}` : `${base}/comments`)"
      >
        {{ c.text }}
      </button>
    </div>

    <div class="space-y-6">
      <div v-for="g in groups" :key="g.k">
        <div class="mb-2.5 flex items-center gap-2">
          <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl" :style="{ color: stepTone(a, g.k)[0], background: stepTone(a, g.k)[1] }">
            <AIcon :name="stepGlyph(a, g.k)" cls="h-3.5 w-3.5" />
          </span>
          <button type="button" class="text-[15px] font-extrabold hover:text-brand-deep" @click="router.push(`${base}/step/${g.k}`)">{{ stepTitle(a, g.k) }}</button>
          <span class="text-[12.5px] font-semibold text-muted-foreground">{{ g.ts.length }}</span>
        </div>
        <div class="space-y-2">
          <CommentThread v-for="t in g.ts.slice(0, count(g.k))" :key="t.id" :thread="t" :comments="comments" :scene-name="sceneName(a, t.sceneKey)" />
        </div>
        <button
          v-if="g.ts.length > count(g.k)"
          type="button"
          class="mt-3 w-full rounded-md border border-dashed border-border bg-white py-2 text-[12.5px] font-bold text-brand-deep hover:border-brand-deep"
          @click="more(g.k)"
        >
          Show {{ Math.min(g.ts.length - count(g.k), PAGE) }} more <span class="font-semibold text-muted-foreground">· {{ g.ts.length - count(g.k) }} left</span>
        </button>
      </div>
      <div v-if="!groups.length" class="rounded-lg bg-white p-6 text-center text-[13.5px] text-muted-foreground shadow-xs">
        <template v-if="query.trim()">Nothing matches “{{ query.trim() }}”.</template>
        <template v-else-if="tab === 'open'">
          No open comments{{ step ? ' on this step' : '' }}. People leave them from
          <button type="button" class="font-bold text-brand-deep hover:underline" @click="router.push(`${base}/test`)">Try it</button>.
        </template>
        <template v-else>Nothing resolved{{ step ? ' on this step' : '' }} yet.</template>
      </div>
    </div>
    <div class="mt-8 flex justify-end border-t border-border pb-12 pt-5">
      <button type="button" :class="btnDeep" @click="router.push(base)">Done</button>
    </div>
  </div>
</template>
