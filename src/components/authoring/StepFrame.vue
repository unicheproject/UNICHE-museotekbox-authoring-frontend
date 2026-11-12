<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { CommentThreadDto } from '@/api/museotekBox'
import type { Authoring, FixRow } from '@/lib/authoring/engine'
import { stepKeys, stepTitle } from '@/lib/authoring/tone'
import AIcon from './AIcon.vue'
import StepComments from './ui/StepComments.vue'
import { btnDeep, btnOutline } from './ui/styles'

/**
 * One step of the visit, under the experience's shared header and step row (drawn once by the
 * experience page, so they never move): the step's name, one line saying what this step still needs, the step's numbered questions (the default slot), and
 * the way to the step before, the next one, or back to the overview. Changes save as you go, so
 * moving on never needs a "save" first. An activity can also be moved and removed; the Start and End cannot.
 */
const props = defineProps<{
  a: Authoring
  stepKey: string
  base: string
  fixes: FixRow[]
  movable?: boolean
  /** The open comments about this step. */
  comments: CommentThreadDto[]
}>()
const emit = defineEmits<{ up: []; down: []; remove: []; comments: [] }>()

const router = useRouter()

const keys = computed(() => stepKeys(props.a))
const at = computed(() => keys.value.indexOf(props.stepKey))
const prev = computed(() => keys.value[at.value - 1])
const next = computed(() => keys.value[at.value + 1])
const isl = computed(() => props.a.islands.findIndex((x) => x.key === props.stepKey))
const go = (k: string) => router.push(`${props.base}/step/${k}`)
/** What this step still needs, its own gaps and its hand-over to the next one. */
const left = computed(() => props.fixes.filter((r) => r.key === props.stepKey))
const lower = (t: string) => t.charAt(0).toLowerCase() + t.slice(1)
/** Brings the first missing thing of this step into view. */
function showFirst() {
  const el = document.querySelector('[data-miss]') as HTMLElement | null
  if (!el) return
  el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  el.classList.remove('flash')
  void el.offsetWidth
  el.classList.add('flash')
}
</script>

<template>
  <div>

    <!-- The step's name and its state on one line: ready, or how many things are left and the next one. -->
    <div class="mb-4 mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1" role="status">
      <h2 class="text-xl font-bold tracking-tight">{{ stepTitle(a, stepKey) }}</h2>
      <template v-if="left.length">
        <span class="inline-flex items-center gap-1.5 text-[13px] font-medium text-warning">
          <span class="h-1.5 w-1.5 translate-y-[-1px] rounded-full bg-warning" aria-hidden="true" />{{ left.length }} to fix
        </span>
        <span class="text-[13px] text-muted-foreground">Next: {{ lower(left[0].gap) }}</span>
        <button type="button" class="text-[13px] font-medium text-brand-deep hover:underline" @click="showFirst">Show me</button>
      </template>
      <span v-else class="inline-flex items-center gap-1 text-[13px] font-medium text-success">
        <AIcon name="check" cls="h-3.5 w-3.5" />Ready<span class="font-normal text-muted-foreground">
          · {{ next ? `You can go on to ${stepTitle(a, next)}.` : 'Go back to the overview to publish.' }}</span
        >
      </span>
    </div>

    <div class="space-y-5">
      <StepComments :open="comments" @view="emit('comments')" />
      <slot />
    </div>

    <div v-if="movable" class="mt-5 flex flex-wrap gap-2.5">
      <button v-if="isl > 0" type="button" :class="[btnOutline, '!py-2.5 !text-[13px]']" @click="emit('up')"><AIcon name="up" />Move earlier</button>
      <button v-if="isl < a.islands.length - 1" type="button" :class="[btnOutline, '!py-2.5 !text-[13px]']" @click="emit('down')">
        <AIcon name="down" />Move later
      </button>
      <button type="button" :class="[btnOutline, '!py-2.5 !text-[13px] hover:!border-destructive hover:!text-destructive']" @click="emit('remove')">
        <AIcon name="trash" />Remove this activity
      </button>
    </div>

    <div class="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pb-12 pt-6">
      <button v-if="prev" type="button" :class="btnOutline" @click="go(prev)"><AIcon name="left" />{{ stepTitle(a, prev) }}</button>
      <span v-else />
      <div class="flex flex-wrap gap-3">
        <button type="button" :class="btnOutline" @click="router.push(base)">Back to overview</button>
        <button v-if="next" type="button" :class="btnDeep" @click="go(next)">Next: {{ stepTitle(a, next) }}<AIcon name="arrow" /></button>
      </div>
    </div>
  </div>
</template>
