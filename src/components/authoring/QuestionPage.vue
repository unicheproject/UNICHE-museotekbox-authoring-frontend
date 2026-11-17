<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  LETTERS,
  REPLY_KINDS,
  SCREEN_PRESETS,
  answerHex,
  answersFor,
  colorHex,
  goOf,
  goTarget,
  hasDisplay,
  infoMoveOn,
  isInfo,
  itemId,
  itemLabel,
  mediaOf,
  newQuestion,
  or,
  presetOf,
  questionGaps,
  questionsOnly,
  usesScreen,
  type Authoring,
  type Cfg,
  type FixRow,
  type ReplyKind,
} from '@/lib/authoring/engine'
import { thumbOf } from '@/lib/authoring/media'
import { ConfirmDialog } from '@/components/ui/dialog'
import AIcon from './AIcon.vue'
import CustomRows from './CustomRows.vue'
import ScreenPreview from './ScreenPreview.vue'
import SwatchRow from './SwatchRow.vue'
import Choice from './ui/Choice.vue'
import MediaField from './ui/MediaField.vue'
import MoreSettings from './ui/MoreSettings.vue'
import QCard from './ui/QCard.vue'
import SaveState from './ui/SaveState.vue'
import ScanField from './ui/ScanField.vue'
import Seconds from './ui/Seconds.vue'
import Sub from './ui/Sub.vue'
import { addBtn, bigInput, btnDeep, btnOutline, dialogBody, dialogBox, dialogClose, dialogHead, dialogTitle, overlay, rowRemove } from './ui/styles'

/**
 * One question or slide of a quiz on a page of its own: back to the quiz and every item of it in a
 * row, then its numbered questions — what is asked, what the visitor sees or hears, the answers and
 * which is right, where each leads, the clue — and the rare settings folded away.
 */
const props = defineProps<{ a: Authoring; cfg: Cfg; stepKey: string; index: number; name: string; base: string; saving: boolean; fixes: FixRow[] }>()
const emit = defineEmits<{ change: [] }>()

const router = useRouter()

const qs = computed<Cfg[]>(() => props.cfg.questions)
const q = computed(() => qs.value[props.index])
const info = computed(() => isInfo(q.value))
const display = computed(() => hasDisplay(props.a))
const preset = computed(() => (display.value && !info.value ? presetOf(q.value.screen) : undefined))
const onScreen = computed(() => usesScreen(props.a, q.value))
const total = computed(() => questionsOnly(qs.value).length)
const number = computed(() => questionsOnly(qs.value.slice(0, props.index + 1)).length)
const label = (o: Cfg) => (isInfo(o) ? 'Slide' : itemLabel(qs.value, o))
const quizUrl = computed(() => `${props.base}/step/${props.stepKey}`)
const goItem = (n: number) => router.push(`${quizUrl.value}/q/${n}`)

// ─── the panel: it opens over the quiz, so the list stays where the author left it
const panel = ref<HTMLElement | null>(null)
const close = () => router.push(quizUrl.value)
function onKey(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  // A picker or confirmation open over the panel closes first.
  if (choosingScreen.value || picking.value != null || confirming.value) return
  if (document.querySelector('[role="alertdialog"]')) return
  close()
}
onMounted(async () => {
  window.addEventListener('keydown', onKey)
  await nextTick()
  panel.value?.focus()
})
onUnmounted(() => window.removeEventListener('keydown', onKey))

function set(key: string, value: unknown) {
  q.value[key] = value
  emit('change')
}
/** The question in words is both its name in the quiz and what a ready-made screen asks. */
function setAsk(value: string) {
  q.value.name = value
  if (q.value.screen) q.value.ask = value
  emit('change')
}

// ─── what is still missing, card by card
const missMedia = computed(() =>
  !display.value ? !q.value.audio : preset.value ? !!preset.value.media && !q.value.screenMedia : !(q.value.display || []).length,
)
const missRight = computed(() =>
  onScreen.value ? q.value.right == null || (q.value.answers || []).some((x: Cfg) => !x.scan || (preset.value?.pictures && !x.media)) : !q.value.correct,
)
const hasVideo = computed(() => (q.value.display || []).some((c: Cfg) => c.type === 'VIDEO'))
const slideMoveMiss = computed(() => {
  const how = infoMoveOn(props.a, q.value)
  return (how === 'time' && !q.value.seconds) || (how === 'video' && !hasVideo.value)
})

// ─── what a question shows: pictures, videos and drawings, as many as the author adds
const SHOW = [
  { type: 'IMAGE', icon: 'image', label: 'Picture' },
  { type: 'VIDEO', icon: 'film', label: 'Video' },
  { type: 'ILLUSTRATION', icon: 'brush', label: 'Drawing' },
] as const
const showOf = (type: string) => SHOW.find((s) => s.type === type) ?? SHOW[0]
function addShown(type: string) {
  if (!q.value.display) q.value.display = []
  q.value.display.push({ type, name: '' })
  emit('change')
}
function setShown(k: number, name: string) {
  q.value.display[k].name = name
  emit('change')
}
function delShown(k: number) {
  q.value.display.splice(k, 1)
  emit('change')
}
const firstShown = computed(() => {
  const m = mediaOf(((q.value.display || [])[0] || {}).name)
  return m && m.kind === 'IMAGE' ? thumbOf(m.id) : undefined
})

// ─── the screen: the author's own media, or one of the ready-made layouts
const choosingScreen = ref(false)
const samples = SCREEN_PRESETS.map((p) => ({ p, s: { screen: p.id, answers: answersFor(p) } }))
function chooseScreen(id: string) {
  const p = presetOf(id)
  q.value.screen = p ? p.id : ''
  if (p) {
    q.value.answers = answersFor(p, q.value.answers || [])
    if (q.value.right != null && q.value.right >= q.value.answers.length) q.value.right = null
    if (!q.value.ask && q.value.name) q.value.ask = q.value.name
  }
  choosingScreen.value = false
  emit('change')
}

// ─── the answers of a ready-made screen
const answers = computed<Cfg[]>(() => q.value.answers || [])
function setAnswer(k: number, key: string, value: unknown) {
  answers.value[k][key] = value
  emit('change')
}
function addAnswer() {
  if (answers.value.length < 4) answers.value.push({ text: '', scan: '', media: '' })
  emit('change')
}
function delAnswer(k: number) {
  if (answers.value.length <= 2) return
  answers.value.splice(k, 1)
  if (q.value.right === k) q.value.right = null
  else if (q.value.right > k) q.value.right--
  emit('change')
}

// ─── where each answer leads
const picking = ref<number | null>(null)
const pickingTarget = computed(() => (picking.value == null ? null : goTarget(qs.value, q.value, goOf(q.value, picking.value))))
function chooseGo(to: Cfg | null) {
  if (picking.value == null) return
  answers.value[picking.value].go = to ? itemId(to) : 'end'
  picking.value = null
  emit('change')
}
const targetThumb = (o: Cfg) => {
  const m = mediaOf(((o.display || [])[0] || {}).name)
  return m && m.kind === 'IMAGE' ? thumbOf(m.id) : undefined
}

// ─── "Say something different on this question"
const ownOpen = ref(
  !!q.value.replies && Object.values(q.value.replies as Record<string, Cfg>).some((r) => r && Object.values(r).some(Boolean)),
)
function setReply(kind: ReplyKind, key: 'text' | 'color' | 'media' | 'audio', value: string) {
  if (!q.value.replies) q.value.replies = { correct: {}, hint: {}, wrong: {} }
  q.value.replies[kind] = { ...(q.value.replies[kind] || {}), [key]: value }
  emit('change')
}
if (!q.value.customs) q.value.customs = []

// ─── adding, removing
function another() {
  const item = newQuestion(1)
  item.name = ''
  qs.value.push(item)
  emit('change')
  goItem(qs.value.length - 1)
}
const confirming = ref(false)
function remove() {
  confirming.value = false
  qs.value.splice(props.index, 1)
  if (!qs.value.length) qs.value.push(newQuestion(1))
  emit('change')
  router.push(quizUrl.value)
}
</script>

<template>
  <Teleport to="body">
  <div v-if="q" class="dialog-overlay fixed inset-0 z-50 flex justify-end">
    <!-- The quiz stays in view behind the panel; a click on it closes the panel. -->
    <div class="absolute inset-0 bg-[#0b1020]/40 backdrop-blur-[1px]" aria-hidden="true" @click="close" />
    <section
      ref="panel"
      role="dialog"
      aria-modal="true"
      :aria-label="info ? 'Edit slide' : 'Edit question'"
      tabindex="-1"
      class="panel-in relative flex h-full w-full max-w-[760px] flex-col bg-surface-2 shadow-2xl outline-none"
    >
    <!-- Every item of the quiz, the one you are on filled, and the way back to the quiz. -->
    <header class="flex items-center gap-3 border-b border-border bg-white px-4 py-3 sm:px-6">
      <nav aria-label="Questions and slides" class="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-1">
        <button
          v-for="(o, i) in qs"
          :key="i"
          type="button"
          :title="or(o.name, label(o))"
          :aria-current="i === index ? 'page' : undefined"
          class="relative flex h-9 min-w-[36px] shrink-0 items-center justify-center rounded-full px-2 text-[13px] font-extrabold transition-shadow"
          :class="
            i === index
              ? 'bg-brand-deep text-white ring-4 ring-brand-deep/15'
              : questionGaps(a, o).length
                ? 'bg-warning/[.06] text-warning ring-2 ring-warning/40 hover:ring-brand-deep'
                : 'bg-white text-secondary-foreground ring-1 ring-border hover:ring-brand-deep'
          "
          @click="goItem(i)"
        >
          <AIcon v-if="isInfo(o)" name="slide" />
          <template v-else>{{ questionsOnly(qs.slice(0, i + 1)).length }}</template>
          <span
            v-if="questionGaps(a, o).length && i !== index"
            class="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-warning text-[9px] font-extrabold text-white ring-2 ring-white"
            >!</span
          >
        </button>
      </nav>
      <SaveState :saving="saving" class="hidden sm:flex" />
      <button type="button" aria-label="Close and go back to the quiz" title="Close" class="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-surface-2 hover:text-foreground" @click="close">
        <AIcon name="x" cls="h-5 w-5" />
      </button>
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
    <!-- A slide: something to watch or listen to between questions, with no answer. -->
    <template v-if="info">
      <div class="mb-5 flex items-center gap-4">
        <span class="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[#ede7f6] text-brand-deep"><AIcon name="slide" cls="h-7 w-7" /></span>
        <div class="flex-1">
          <div class="text-[13.5px] font-bold text-muted-foreground">Slide · no answer needed</div>
          <h1 class="text-2xl font-extrabold leading-tight tracking-tight">{{ or(q.name, 'Untitled slide') }}</h1>
        </div>
      </div>
      <div class="space-y-5">
        <QCard :n="1" title="Its heading" optional>
          <input :value="q.name" placeholder="e.g. Did you know?" :class="bigInput" @input="set('name', ($event.target as HTMLInputElement).value)" />
        </QCard>
        <QCard v-if="!display" :n="2" title="What does the visitor hear?" id="s-show" :miss="!q.audio">
          <MediaField kind="AUDIO" :model-value="q.audio" @update:model-value="set('audio', $event)" />
        </QCard>
        <QCard v-else :n="2" title="What does the visitor see?" id="s-show" :miss="!(q.display || []).length">
          <div class="space-y-3">
            <div v-for="(c, k) in q.display || []" :key="k" class="flex items-center gap-3">
              <span
                class="hidden w-32 shrink-0 items-center gap-2 rounded-lg bg-surface-2 px-3 py-2.5 text-[13px] font-extrabold uppercase tracking-overline text-brand-deep sm:inline-flex"
              >
                <AIcon :name="showOf(c.type).icon" />{{ showOf(c.type).label }}
              </span>
              <div class="min-w-0 flex-1"><MediaField :kind="c.type" :model-value="c.name" bare @update:model-value="setShown(k, $event)" /></div>
              <button type="button" aria-label="Remove" title="Remove" class="rounded-lg p-2 text-muted-foreground hover:bg-red-50 hover:text-destructive" @click="delShown(k)">
                <AIcon name="x" cls="h-5 w-5" />
              </button>
            </div>
            <p v-if="!(q.display || []).length" class="rounded-md border border-dashed border-warning/40 bg-warning/[.04] px-4 py-3 text-[13.5px] font-semibold text-warning">
              Nothing to show yet — add a video, a picture or a drawing.
            </p>
            <div class="grid gap-3 sm:grid-cols-3">
              <button
                v-for="t in SHOW"
                :key="t.type"
                type="button"
                class="flex items-center justify-center gap-2 rounded-md border border-dashed border-brand-deep/30 px-4 py-3 text-[13.5px] font-extrabold text-brand-deep hover:border-brand-deep hover:bg-brand-deep/[.03]"
                @click="addShown(t.type)"
              >
                <AIcon name="plus" />{{ t.label }}
              </button>
            </div>
          </div>
        </QCard>
        <QCard v-if="display" :n="3" title="Does the Box play a sound?" optional>
          <MediaField kind="AUDIO" :model-value="q.audio" @update:model-value="set('audio', $event)" />
        </QCard>
        <QCard :n="display ? 4 : 3" title="When does it move on?" id="s-next" :miss="slideMoveMiss">
          <div class="grid gap-3" :class="display && hasVideo ? 'sm:grid-cols-3' : 'sm:grid-cols-2'">
            <Choice :on="infoMoveOn(a, q) === 'time'" icon="timer" label="After some seconds" @pick="set('moveOn', 'time')" />
            <Choice v-if="display && hasVideo" :on="infoMoveOn(a, q) === 'video'" icon="film" label="When the video ends" @pick="set('moveOn', 'video')" />
            <Choice :on="infoMoveOn(a, q) === 'scan'" icon="scan" label="When they place any scan" @pick="set('moveOn', 'scan')" />
          </div>
          <div v-if="infoMoveOn(a, q) === 'time'" class="mt-5">
            <Seconds :model-value="q.seconds" @update:model-value="set('seconds', $event)" />
          </div>
          <p v-else-if="infoMoveOn(a, q) === 'video' && !hasVideo" class="mt-5 flex items-center gap-2.5 rounded-md bg-warning/[.06] px-4 py-3 text-[13.5px] font-bold text-warning">
            <AIcon name="alert" cls="h-5 w-5" />There is no video to wait for — add one, or choose another way to move on.
          </p>
        </QCard>
      </div>
      <div class="mt-5">
        <button type="button" :class="[btnOutline, '!py-2.5 !text-[13px] hover:!border-destructive hover:!text-destructive']" @click="confirming = true">
          <AIcon name="trash" />Remove this slide
        </button>
      </div>
    </template>

    <!-- A question. -->
    <template v-else>
      <div class="mb-5 flex items-center gap-4">
        <div class="flex-1">
          <div class="text-[13.5px] font-bold text-muted-foreground">Question {{ number }} of {{ total }}</div>
          <h1 class="text-2xl font-extrabold leading-tight tracking-tight">{{ or(q.name, 'Untitled question') }}</h1>
        </div>
      </div>
      <div class="space-y-5">
        <QCard :n="1" title="What do you ask?">
          <input :value="q.name" placeholder="Type the question" :class="bigInput" @input="setAsk(($event.target as HTMLInputElement).value)" />
        </QCard>

        <QCard v-if="!display" :n="2" title="What does the visitor hear?" id="q-media" :miss="missMedia">
          <MediaField kind="AUDIO" :model-value="q.audio" @update:model-value="set('audio', $event)" />
        </QCard>
        <QCard v-else :n="2" title="What does the visitor see on the screen?" id="q-media" :miss="missMedia">
          <button type="button" class="flex w-full items-center gap-4 rounded-md border border-border bg-white p-3 text-left hover:border-brand-deep" @click="choosingScreen = true">
            <span v-if="preset" class="w-24 shrink-0 sm:w-32"><ScreenPreview :a="a" :s="{ screen: preset.id, answers: answersFor(preset) }" sample /></span>
            <span v-else class="flex aspect-video w-24 shrink-0 sm:w-32 items-center justify-center rounded-[.45rem] bg-surface-2 text-brand-deep"><AIcon name="image" cls="h-6 w-6" /></span>
            <span class="min-w-0 flex-1 text-[14px] font-bold">{{ preset ? preset.name : 'My own picture, video or drawing' }}</span>
            <span class="rounded-lg px-3 py-2 text-[13.5px] font-bold text-brand-deep">Change</span>
          </button>
          <div class="mt-6">
            <template v-if="preset">
              <div v-if="preset.media" class="mb-6">
                <Sub :title="preset.media === 'VIDEO' ? 'The video' : 'The picture'" />
                <MediaField :kind="preset.media === 'VIDEO' ? 'VIDEO' : 'PICTURE'" :model-value="q.screenMedia" @update:model-value="set('screenMedia', $event)" />
              </div>
              <Sub title="Preview" />
              <div class="max-w-[560px]"><ScreenPreview :a="a" :s="q" mark /></div>
            </template>
            <template v-else>
              <div v-if="firstShown" class="relative mb-4 aspect-video max-w-[420px] overflow-hidden rounded-md">
                <img :src="firstShown" alt="" class="absolute inset-0 h-full w-full object-cover" />
                <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-4 text-[15px] font-extrabold text-white">{{ q.name }}</div>
              </div>
              <div class="space-y-3">
                <div v-for="(c, k) in q.display || []" :key="k" class="flex items-center gap-3">
                  <span
                    class="hidden w-32 shrink-0 items-center gap-2 rounded-lg bg-surface-2 px-3 py-2.5 text-[13px] font-extrabold uppercase tracking-overline text-brand-deep sm:inline-flex"
                  >
                    <AIcon :name="showOf(c.type).icon" />{{ showOf(c.type).label }}
                  </span>
                  <div class="min-w-0 flex-1"><MediaField :kind="c.type" :model-value="c.name" bare @update:model-value="setShown(k, $event)" /></div>
                  <button type="button" aria-label="Remove" title="Remove" class="rounded-lg p-2 text-muted-foreground hover:bg-red-50 hover:text-destructive" @click="delShown(k)">
                    <AIcon name="x" cls="h-5 w-5" />
                  </button>
                </div>
                <p v-if="!(q.display || []).length" class="rounded-md border border-dashed border-warning/40 bg-warning/[.04] px-4 py-3 text-[13.5px] font-semibold text-warning">
                  Nothing to show yet — a question is never plain text, it is a picture, a video or a drawing.
                </p>
                <div class="grid gap-3 sm:grid-cols-3">
                  <button
                    v-for="t in SHOW"
                    :key="t.type"
                    type="button"
                    class="flex items-center justify-center gap-2 rounded-md border border-dashed border-brand-deep/30 px-4 py-3 text-[13.5px] font-extrabold text-brand-deep hover:border-brand-deep hover:bg-brand-deep/[.03]"
                    @click="addShown(t.type)"
                  >
                    <AIcon name="plus" />{{ t.label }}
                  </button>
                </div>
              </div>
            </template>
          </div>
        </QCard>

        <QCard v-if="onScreen && preset" :n="3" title="The answers" id="q-right" :miss="missRight">
          <div class="space-y-3">
            <div
              v-for="(x, k) in answers"
              :key="k"
              class="rounded-md border p-4"
              :class="q.right === k ? 'border-success bg-success/[.04]' : !x.scan ? 'border-warning/40' : 'border-border'"
            >
              <div class="flex items-center gap-3">
                <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[14px] font-extrabold text-white" :style="{ background: answerHex(a, x) }">
                  {{ LETTERS[k] }}
                </span>
                <input
                  :value="x.text"
                  :placeholder="`Answer ${LETTERS[k]}`"
                  :class="[bigInput, '!py-2.5']"
                  @input="setAnswer(k, 'text', ($event.target as HTMLInputElement).value)"
                />
                <button v-if="answers.length > 2" type="button" :class="rowRemove" @click="delAnswer(k)">Remove</button>
              </div>
              <div v-if="preset.pictures" class="mt-4">
                <Sub title="Its picture" />
                <MediaField kind="PICTURE" :model-value="x.media" @update:model-value="setAnswer(k, 'media', $event)" />
              </div>
              <div class="mt-4">
                <Sub title="Its scan" />
                <ScanField :types="a.scanTypes" :model-value="x.scan" @update:model-value="setAnswer(k, 'scan', $event)" />
              </div>
              <div class="mt-4">
                <Sub title="Colour" optional />
                <SwatchRow :model-value="x.color || ''" @update:model-value="setAnswer(k, 'color', $event)" />
              </div>
              <button
                type="button"
                class="mt-4 inline-flex items-center gap-2.5 rounded-md border px-4 py-2.5 text-[13.5px] font-bold"
                :class="q.right === k ? 'border-success bg-success text-white' : 'border-border bg-white hover:border-success hover:text-success'"
                @click="set('right', k)"
              >
                <span class="flex h-5 w-5 items-center justify-center rounded-full border" :class="q.right === k ? 'border-white' : 'border-input'">
                  <AIcon v-if="q.right === k" name="check" cls="h-3.5 w-3.5" />
                </span>
                {{ q.right === k ? 'This is the right answer' : 'Make this the right answer' }}
              </button>
            </div>
          </div>
          <button v-if="answers.length < 4" type="button" :class="[addBtn, 'mt-3']" @click="addAnswer"><AIcon name="plus" cls="h-5 w-5" />Add an answer</button>
        </QCard>
        <QCard v-else :n="3" title="Which scan is the right answer?" id="q-right" :miss="missRight">
          <ScanField :types="a.scanTypes" :model-value="q.correct" @update:model-value="set('correct', $event)" />
        </QCard>

        <QCard v-if="onScreen" :n="4" title="Where does the visitor go next?">
          <div class="grid gap-3 sm:grid-cols-2">
            <Choice :on="!q.branch" label="Always to the next question" @pick="set('branch', false)" />
            <Choice :on="!!q.branch" icon="route" label="It depends on the answer" @pick="set('branch', true)" />
          </div>
          <div v-if="q.branch" class="mt-5 space-y-2.5">
            <button
              v-for="(x, k) in answers"
              :key="k"
              type="button"
              class="flex w-full flex-wrap items-center gap-3 rounded-md border border-border bg-white p-3 text-left hover:border-brand-deep sm:flex-nowrap"
              @click="picking = k"
            >
              <span class="flex min-w-0 items-center gap-3 sm:w-[38%]">
                <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13.5px] font-extrabold text-white" :style="{ background: answerHex(a, x) }">{{ LETTERS[k] }}</span>
                <span class="truncate text-[14px] font-bold">{{ or(x.text, 'Answer ' + LETTERS[k]) }}</span>
              </span>
              <span class="text-muted-foreground"><AIcon name="arrow" cls="h-5 w-5" /></span>
              <span class="flex min-w-0 flex-1 items-center gap-3">
                <template v-if="goTarget(qs, q, goOf(q, k))">
                  <span v-if="usesScreen(a, goTarget(qs, q, goOf(q, k)))" class="w-16 shrink-0"><ScreenPreview :a="a" :s="goTarget(qs, q, goOf(q, k))!" sample /></span>
                  <img v-else-if="targetThumb(goTarget(qs, q, goOf(q, k))!)" :src="targetThumb(goTarget(qs, q, goOf(q, k))!)" alt="" class="aspect-video w-16 shrink-0 rounded-lg object-cover" />
                  <span v-else class="flex aspect-video w-16 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted-foreground"><AIcon name="image" /></span>
                  <span class="min-w-0">
                    <span class="block text-[13px] font-bold text-muted-foreground">{{ label(goTarget(qs, q, goOf(q, k))!) }}</span>
                    <span class="block truncate text-[14px] font-bold">{{ or(goTarget(qs, q, goOf(q, k))!.name, 'Untitled question') }}</span>
                  </span>
                </template>
                <template v-else>
                  <span class="flex aspect-video w-16 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-brand-deep"><AIcon name="flag" cls="h-5 w-5" /></span>
                  <span class="text-[14px] font-bold">End of the quiz</span>
                </template>
              </span>
              <span class="px-2 text-[13.5px] font-bold text-brand-deep">Change</span>
            </button>
          </div>
        </QCard>

        <QCard :n="onScreen ? 5 : 4" title="Which scan gives a clue?" optional>
          <ScanField :types="a.scanTypes" :model-value="q.hint" optional @update:model-value="set('hint', $event)" />
        </QCard>

        <MoreSettings>
          <div v-if="display">
            <Sub title="Sound with the question" optional />
            <MediaField kind="AUDIO" :model-value="q.audio" @update:model-value="set('audio', $event)" />
          </div>
          <label class="flex cursor-pointer items-center gap-3 text-[14px] font-bold">
            <input v-model="ownOpen" type="checkbox" class="h-6 w-6 accent-[#4c1d8b]" />Say something different on this question
          </label>
          <div v-if="ownOpen" class="space-y-4">
            <p class="text-[13.5px] text-muted-foreground">Anything left empty uses the experience's replies.</p>
            <div v-for="k in REPLY_KINDS" :key="k.key" class="space-y-4 rounded-md border border-border p-4">
              <div class="flex items-center gap-2.5 text-[14px] font-extrabold">
                <span class="h-4 w-4 rounded-full" :style="{ background: colorHex(q.replies?.[k.key]?.color || a.details.replies[k.key].color) }" />{{ k.label }}
              </div>
              <div v-if="display">
                <Sub title="Words on the screen" />
                <input
                  :value="q.replies?.[k.key]?.text || ''"
                  :placeholder="a.details.replies[k.key].text"
                  :class="[bigInput, '!py-2.5']"
                  @input="setReply(k.key, 'text', ($event.target as HTMLInputElement).value)"
                />
              </div>
              <div>
                <Sub :title="display ? 'Picture' : 'Sound from the Box'" optional />
                <MediaField
                  :kind="display ? 'PICTURE' : 'AUDIO'"
                  :model-value="q.replies?.[k.key]?.[display ? 'media' : 'audio']"
                  @update:model-value="setReply(k.key, display ? 'media' : 'audio', $event)"
                />
              </div>
              <div v-if="display">
                <Sub title="Colour" />
                <SwatchRow :model-value="q.replies?.[k.key]?.color || a.details.replies[k.key].color" @update:model-value="setReply(k.key, 'color', $event)" />
              </div>
            </div>
            <div>
              <Sub title="Wrong answers with their own reply" />
              <CustomRows :a="a" :rows="q.customs" one @change="emit('change')" />
            </div>
          </div>
        </MoreSettings>
      </div>
      <div class="mt-5">
        <button type="button" :class="[btnOutline, '!py-2.5 !text-[13px] hover:!border-destructive hover:!text-destructive']" @click="confirming = true">
          <AIcon name="trash" />Remove this question
        </button>
      </div>
    </template>

    </div>

    <footer class="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-white px-4 py-3 sm:px-6">
      <button v-if="index > 0" type="button" :class="btnOutline" :title="or(qs[index - 1].name, label(qs[index - 1]))" @click="goItem(index - 1)"><AIcon name="left" />Previous</button>
      <span v-else />
      <div class="flex flex-wrap gap-3">
        <button v-if="index === qs.length - 1" type="button" :class="btnOutline" @click="another"><AIcon name="plus" />Another question</button>
        <button v-else type="button" :class="btnOutline" :title="or(qs[index + 1].name, label(qs[index + 1]))" @click="goItem(index + 1)">Next<AIcon name="arrow" /></button>
        <button type="button" :class="btnDeep" @click="close">Done</button>
      </div>
    </footer>
    </section>

    <!-- Choose the screen: the author's own picture or video, or one of the eight, each drawn small. -->
    <Teleport to="body">
      <div v-if="choosingScreen" :class="overlay" @click.self="choosingScreen = false">
        <div role="dialog" aria-modal="true" aria-label="Choose the screen" :class="[dialogBox, 'max-w-3xl']">
          <div :class="[dialogHead, 'items-center']">
            <h2 :class="[dialogTitle, 'min-w-0 flex-1']">Choose the screen</h2>
            <button type="button" title="Close" aria-label="Close" :class="dialogClose" @click="choosingScreen = false"><AIcon name="x" cls="h-5 w-5" /></button>
          </div>
          <div :class="dialogBody">
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <button
                type="button"
                class="flex flex-col gap-2 rounded-md border p-2 text-left transition-colors"
                :class="!preset ? 'border-brand-deep bg-brand-deep/[.06]' : 'border-border bg-white hover:border-brand-deep/50'"
                @click="chooseScreen('')"
              >
                <span class="flex aspect-video items-center justify-center rounded-[.45rem] bg-surface-2 text-brand-deep"><AIcon name="image" cls="h-7 w-7" /></span>
                <span class="flex items-center gap-1.5 px-1 pb-0.5 text-[13px] font-bold leading-tight" :class="{ 'text-brand-deep': !preset }">
                  <AIcon v-if="!preset" name="check" cls="h-4 w-4 shrink-0" />My own picture, video or drawing
                </span>
              </button>
              <button
                v-for="x in samples"
                :key="x.p.id"
                type="button"
                class="flex flex-col gap-2 rounded-md border p-2 text-left transition-colors"
                :class="q.screen === x.p.id ? 'border-brand-deep bg-brand-deep/[.06]' : 'border-border bg-white hover:border-brand-deep/50'"
                @click="chooseScreen(x.p.id)"
              >
                <ScreenPreview :a="a" :s="x.s" sample />
                <span class="flex items-center gap-1.5 px-1 pb-0.5 text-[13px] font-bold leading-tight" :class="{ 'text-brand-deep': q.screen === x.p.id }">
                  <AIcon v-if="q.screen === x.p.id" name="check" cls="h-4 w-4 shrink-0" />{{ x.p.name }}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Go to: every other item of the quiz, and the end of it. -->
      <div v-if="picking != null" :class="overlay" @click.self="picking = null">
        <div role="dialog" aria-modal="true" aria-label="Go to" :class="[dialogBox, 'max-w-2xl']">
          <div :class="[dialogHead, 'items-center']">
            <h2 :class="[dialogTitle, 'min-w-0 flex-1']">Go to</h2>
            <button type="button" title="Close" aria-label="Close" :class="dialogClose" @click="picking = null"><AIcon name="x" cls="h-5 w-5" /></button>
          </div>
          <div :class="[dialogBody, 'space-y-2.5']">
            <button
              v-for="(o, n) in qs.filter((x) => x !== q)"
              :key="n"
              type="button"
              class="flex w-full items-center gap-4 rounded-md border p-3 text-left"
              :class="pickingTarget === o ? 'border-brand-deep bg-brand-deep/[.06]' : 'border-border hover:border-brand-deep/50'"
              @click="chooseGo(o)"
            >
              <span v-if="usesScreen(a, o)" class="w-24 shrink-0"><ScreenPreview :a="a" :s="o" sample /></span>
              <img v-else-if="targetThumb(o)" :src="targetThumb(o)" alt="" class="aspect-video w-24 shrink-0 rounded-lg object-cover" />
              <span v-else class="flex aspect-video w-24 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted-foreground"><AIcon name="image" cls="h-5 w-5" /></span>
              <span class="min-w-0">
                <span class="block text-[13px] font-bold text-muted-foreground">{{ label(o) }}</span>
                <span class="block truncate text-[14px] font-bold">{{ or(o.name, 'Untitled question') }}</span>
              </span>
              <AIcon v-if="pickingTarget === o" name="check" cls="ml-auto h-5 w-5 text-brand-deep" />
            </button>
            <button
              type="button"
              class="flex w-full items-center gap-4 rounded-md border p-3 text-left"
              :class="pickingTarget === null ? 'border-brand-deep bg-brand-deep/[.06]' : 'border-border hover:border-brand-deep/50'"
              @click="chooseGo(null)"
            >
              <span class="flex aspect-video w-24 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-brand-deep"><AIcon name="flag" cls="h-6 w-6" /></span>
              <span class="text-[14px] font-bold">End of the quiz</span>
              <AIcon v-if="pickingTarget === null" name="check" cls="ml-auto h-5 w-5 text-brand-deep" />
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <ConfirmDialog
      v-model:open="confirming"
      :title="info ? 'Remove this slide?' : 'Remove this question?'"
      description="Everything set up in it goes with it."
      confirm-label="Remove"
      @confirm="remove"
    />
  </div>
  </Teleport>
</template>
