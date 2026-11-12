<script setup lang="ts">
import { computed } from 'vue'
import {
  LETTERS,
  branchLine,
  hasDisplay,
  infoMoveOn,
  isInfo,
  mediaOf,
  newInfo,
  newQuestion,
  or,
  questionGaps,
  questionsOnly,
  scanName,
  usesScreen,
  type Authoring,
  type Cfg,
} from '@/lib/authoring/engine'
import { thumbOf } from '@/lib/authoring/media'
import AIcon from './AIcon.vue'
import ScreenPreview from './ScreenPreview.vue'
import Choice from './ui/Choice.vue'
import MediaField from './ui/MediaField.vue'
import MoreSettings from './ui/MoreSettings.vue'
import MoveOnCard from './ui/MoveOnCard.vue'
import QCard from './ui/QCard.vue'
import Seconds from './ui/Seconds.vue'
import Sub from './ui/Sub.vue'
import { addBtn, bigInput, btnOutline } from './ui/styles'

/**
 * The Quiz's page: its questions and slides in order — each opens on a page of its own — then when
 * the visitor moves on, and under "More settings" the rules of the game and the result screen.
 */
const props = defineProps<{ a: Authoring; cfg: Cfg; stepKey: string }>()
const emit = defineEmits<{ change: []; replies: []; open: [n: number] }>()

const qs = computed<Cfg[]>(() => props.cfg.questions || [])
const total = computed(() => questionsOnly(qs.value).length)
const display = computed(() => hasDisplay(props.a))
const numberOf = (q: Cfg) => questionsOnly(qs.value.slice(0, qs.value.indexOf(q) + 1)).length

function set(key: string, value: unknown) {
  props.cfg[key] = value
  emit('change')
}

function add(kind: 'question' | 'info') {
  const item = kind === 'info' ? newInfo(1) : newQuestion(1)
  item.name = ''
  props.cfg.questions.push(item)
  emit('change')
  emit('open', props.cfg.questions.length - 1)
}
function move(i: number, dir: number) {
  const j = i + dir
  if (j < 0 || j >= qs.value.length) return
  ;[qs.value[i], qs.value[j]] = [qs.value[j], qs.value[i]]
  emit('change')
}

/** The picture a question or slide shows first, for its row. */
function thumb(q: Cfg) {
  const m = mediaOf(((q.display || [])[0] || {}).name)
  return m && m.kind === 'IMAGE' ? thumbOf(m.id) : undefined
}
/** The second line of a row: what is missing, how a slide moves on, or the right answer. */
function line(q: Cfg) {
  if (questionGaps(props.a, q).length) return { warn: true, text: 'Not finished' }
  if (isInfo(q)) {
    const how = infoMoveOn(props.a, q)
    return { warn: false, text: how === 'video' ? 'Moves on when the video ends' : how === 'scan' ? 'Moves on when any scan is placed' : `Moves on after ${q.seconds || '—'} seconds` }
  }
  if (usesScreen(props.a, q)) {
    const ans = (q.answers || [])[q.right] || {}
    return { warn: false, text: `Right answer: ${or(ans.text, scanName(props.a, ans.scan) || 'Answer ' + LETTERS[q.right])}` }
  }
  return { warn: false, text: `Right answer: ${scanName(props.a, q.correct)}` }
}
</script>

<template>
  <QCard :n="1" title="The questions" id="questions" :miss="qs.some((q) => questionGaps(a, q).length)">
    <div class="space-y-2.5">
      <div
        v-for="(q, i) in qs"
        :key="i"
        class="flex items-center gap-2 rounded-md border p-3 pr-3 hover:border-brand-deep"
        :class="[
          isInfo(q) ? 'border-[#d9ccf0]' : 'border-border',
          isInfo(q) ? 'bg-[#f7f3fd]' : 'bg-white',
        ]"
      >
        <button type="button" class="flex min-w-0 flex-1 items-center gap-3 text-left sm:gap-4" @click="emit('open', i)">
          <span v-if="isInfo(q)" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ede7f6] text-brand-deep">
            <AIcon name="slide" cls="h-[18px] w-[18px]" />
          </span>
          <span v-else class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[13.5px] font-extrabold">
            {{ numberOf(q) }}
          </span>
          <span v-if="usesScreen(a, q)" class="hidden w-24 shrink-0 sm:block"><ScreenPreview :a="a" :s="q" /></span>
          <img v-else-if="thumb(q)" :src="thumb(q)" alt="" class="hidden aspect-video w-24 shrink-0 rounded-lg object-cover sm:block" />
          <span v-else class="hidden aspect-video w-24 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted-foreground sm:flex">
            <AIcon :name="display ? 'image' : 'audio'" cls="h-5 w-5" />
          </span>
          <span class="min-w-0 flex-1">
            <span
              v-if="isInfo(q)"
              class="mb-0.5 inline-block rounded-pill bg-[#ede7f6] px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-overline text-brand-deep"
              >Slide</span
            >
            <span class="block truncate text-[14px] font-bold">{{ or(q.name, isInfo(q) ? 'Untitled slide' : 'Untitled question') }}</span>
            <span class="block text-[13px]" :class="line(q).warn ? 'font-bold text-warning' : 'text-muted-foreground'">{{ line(q).text }}</span>
            <span v-if="branchLine(a, qs, q)" class="mt-0.5 inline-flex items-center gap-1.5 text-[13px] font-bold text-brand-deep">
              <AIcon name="route" cls="h-4 w-4" />{{ branchLine(a, qs, q) }}
            </span>
          </span>
          <span :class="[btnOutline, '!hidden !px-4 !py-2 sm:!inline-flex']">Edit</span>
        </button>
        <span class="flex flex-col">
          <button
            type="button"
            :disabled="i === 0"
            aria-label="Move up"
            class="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-2 hover:text-brand-deep disabled:opacity-25"
            @click="move(i, -1)"
          >
            <AIcon name="up" cls="h-5 w-5" />
          </button>
          <button
            type="button"
            :disabled="i === qs.length - 1"
            aria-label="Move down"
            class="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-2 hover:text-brand-deep disabled:opacity-25"
            @click="move(i, 1)"
          >
            <AIcon name="down" cls="h-5 w-5" />
          </button>
        </span>
      </div>
    </div>
    <div class="mt-3 grid gap-3 sm:grid-cols-2">
      <button type="button" :class="addBtn" @click="add('question')"><AIcon name="plus" cls="h-5 w-5" />Add a question</button>
      <button type="button" :class="addBtn" @click="add('info')"><AIcon name="slide" cls="h-5 w-5" />Add a slide</button>
    </div>
  </QCard>

  <MoveOnCard :a="a" :from-key="stepKey" :n="2" @change="emit('change')" />

  <MoreSettings>
    <div>
      <Sub title="The visitor wins when" />
      <div class="grid gap-3 sm:grid-cols-2">
        <Choice :on="cfg.winMode === 'all'" label="They answer every question" @pick="set('winMode', 'all')" />
        <Choice :on="cfg.winMode !== 'all'" label="Enough answers are right" @pick="set('winMode', 'count')" />
      </div>
      <div v-if="cfg.winMode !== 'all'" class="mt-3 flex items-center gap-3">
        <input
          type="number"
          min="1"
          :max="total"
          :value="cfg.winCount ?? ''"
          :class="[bigInput, '!w-28']"
          @input="set('winCount', ($event.target as HTMLInputElement).value)"
        />
        <span class="text-[14px]">of {{ total }} right</span>
      </div>
    </div>
    <div>
      <Sub title="Stop the quiz if nothing is placed for" optional />
      <Seconds :model-value="cfg.idleSeconds" @update:model-value="set('idleSeconds', $event)" />
    </div>
    <div>
      <Sub title="Words at the end if they won" />
      <input :value="cfg.resultWin ?? ''" :class="bigInput" @input="set('resultWin', ($event.target as HTMLInputElement).value)" />
    </div>
    <div>
      <Sub title="Words at the end if they did not" />
      <input :value="cfg.resultLose ?? ''" :class="bigInput" @input="set('resultLose', ($event.target as HTMLInputElement).value)" />
    </div>
    <div v-if="display">
      <Sub title="Picture behind those words" optional />
      <MediaField kind="VISUAL" :model-value="cfg.resultMedia" @update:model-value="set('resultMedia', $event)" />
    </div>
    <div>
      <Sub title="Sound at the end" optional />
      <MediaField kind="AUDIO" :model-value="cfg.resultAudio" @update:model-value="set('resultAudio', $event)" />
    </div>
    <button type="button" class="inline-flex items-center gap-1.5 text-[14px] font-bold text-brand-deep hover:underline" @click="emit('replies')">
      What the Box says for right and wrong answers<AIcon name="arrow" />
    </button>
  </MoreSettings>
</template>
