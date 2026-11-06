<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { CommentThreadDto } from '@/api/museotekBox'
import type { Authoring, FixRow } from '@/lib/authoring/engine'
import { stepGlyph, stepKeys, stepTitle, stepTone } from '@/lib/authoring/tone'
import AIcon from './AIcon.vue'
import Crumbs from './ui/Crumbs.vue'
import SaveState from './ui/SaveState.vue'
import StepComments from './ui/StepComments.vue'
import Stepper from './ui/Stepper.vue'
import { btnDeep, btnOutline } from './ui/styles'

/**
 * One step of the visit on a page of its own: where you are, every step in a row, the step's
 * numbered questions (the default slot), and the way to the step before, the next one, or back to
 * the visit. An activity can also be moved and removed; the Start and End cannot.
 */
const props = defineProps<{
  a: Authoring
  stepKey: string
  name: string
  base: string
  saving: boolean
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
</script>

<template>
  <div class="mx-auto max-w-[760px] min-[1700px]:max-w-[1100px]">
    <Crumbs :parts="[{ text: 'Experiences', to: '/experiences' }, { text: name, to: base }, { text: stepTitle(a, stepKey) }]" />
    <Stepper :a="a" :current="stepKey" :base="base" :fixes="fixes" />

    <div class="mb-5 flex flex-wrap items-center gap-4">
      <span
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        :style="{ color: stepTone(a, stepKey)[0], background: stepTone(a, stepKey)[1] }"
      >
        <AIcon :name="stepGlyph(a, stepKey)" cls="h-5 w-5" />
      </span>
      <div class="flex-1">
        <div class="text-[12px] font-bold text-muted-foreground">Step {{ at + 1 }} of {{ keys.length }}</div>
        <h1 class="w-fit text-2xl font-extrabold leading-tight tracking-tight">{{ stepTitle(a, stepKey) }}</h1>
      </div>
      <SaveState :saving="saving" />
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
        <button v-if="next" type="button" :class="btnOutline" @click="go(next)">Next: {{ stepTitle(a, next) }}<AIcon name="arrow" /></button>
        <button type="button" :class="btnDeep" @click="router.push(base)">Done</button>
      </div>
    </div>
  </div>
</template>
