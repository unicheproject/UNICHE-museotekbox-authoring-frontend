<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { OUTPUTS, colorHex, hasDisplay, mediaName, mediaOf, or, scanName, scanType, type Authoring, type Block } from '@/lib/authoring/engine'
import { createEmulator, type LogKind } from '@/lib/authoring/emulator'
import { loadMediaUrl, thumbOf } from '@/lib/authoring/media'
import { stepKeys, stepTitle } from '@/lib/authoring/tone'
import AIcon from './AIcon.vue'
import { btnDeep, btnOutline } from './ui/styles'
import ScreenPreview from './ScreenPreview.vue'
import CommentThread from './CommentThread.vue'
import { IDLE_SCENE, sceneName, type Comments } from '@/lib/authoring/useComments'

/**
 * The test run: the visitor's screen, what the Box is waiting for right now (every
 * object, wait and video as a button), the Box itself, and what just happened — and, beside the
 * Box, the comments, so a tester can say something about the screen they are looking at.
 */
const props = defineProps<{ a: Authoring; comments: Comments }>()
const emit = defineEmits<{ close: [] }>()

const { emu, start, scan, fireKey, choices, sceneOf } = createEmulator(props.a)

const scene = computed(() => sceneOf(emu.sceneId) || props.a.built.scenes[0])
const ch = computed(() => choices(scene.value))
const others = computed(() => props.a.scanTypes.map((t) => t.id).filter((id) => !ch.value.objects.has(id)))
const visible = computed(() => (scene.value?.blocks ?? []).filter((b) => b.type !== 'AUDIO' && b.type !== 'BOX_VIDEO'))
const audios = computed(() => (scene.value?.blocks ?? []).filter((b) => b.type === 'AUDIO'))
const boxVideo = computed(() =>
  emu.idle ? '' : emu.reply?.boxVideo || String(scene.value?.blocks.find((b) => b.type === 'BOX_VIDEO')?.content.url ?? ''),
)
const last = computed(() => emu.log[emu.log.length - 1])
const showLog = ref(false)
const startName = computed(() => scanName(props.a, props.a.details.startCard) || 'the start object')

const LOG_COLOR: Record<LogKind, string> = {
  scan: 'text-brand-deep',
  rule: 'text-muted-foreground',
  goto: 'text-foreground',
  state: 'text-warning',
  box: 'text-success',
  none: 'text-muted-foreground/70',
  sys: 'text-destructive',
}

/** A picture or a video from the library, when the value is one; fetched the first time it is shown. */
const pic = (v: unknown) => {
  const m = mediaOf(String(v ?? ''))
  return m?.kind === 'IMAGE' ? thumbOf(m.id) : undefined
}
const vid = (v: unknown) => {
  const m = mediaOf(String(v ?? ''))
  return m?.kind === 'VIDEO' ? thumbOf(m.id) : undefined
}
/** One picture or video alone fills the screen; several are shown one under the other. */
const alone = computed(() => visible.value.length === 1)

/** When the video on the screen ends, whatever waits for it happens, as on the real Box. */
function videoEnded() {
  const v = ch.value.video[0]
  if (v) fireKey(v.key, 'The video ends')
}

// ─── sound: the scene's own recording when the visitor arrives, and every reply's sound

const player = new Audio()
async function play(v: string | null | undefined) {
  const m = mediaOf(v ?? '')
  if (!m || m.kind !== 'AUDIO') return
  const url = await loadMediaUrl(m.id)
  if (!url) return
  player.src = url
  player.play().catch(() => {})
}
watch(
  () => emu.soundSeq,
  () => emu.sound && play(emu.sound),
)
watch(
  () => [emu.sceneId, emu.idle],
  () => {
    if (emu.idle) return player.pause()
    const first = audios.value[0]
    if (first && !emu.sound) play(String(first.content.url ?? ''))
  },
)
// A reply shows for a moment, as on the real Box, then the screen behind it — usually the next
// question — comes back. A new reply starts its own moment. On a closing screen (the quiz's result)
// the reply is the message itself, so it stays.
const REPLY_MS = 2000
let replyTimer: ReturnType<typeof setTimeout> | null = null
watch(
  () => emu.reply,
  (r) => {
    if (replyTimer) clearTimeout(replyTimer)
    replyTimer = r
      ? setTimeout(() => {
          if (emu.reply === r && scene.value?.kind !== 'outro') emu.reply = null
        }, REPLY_MS)
      : null
  },
)

onUnmounted(() => {
  player.pause()
  if (replyTimer) clearTimeout(replyTimer)
})
// ─── comments: on this screen, or all of them, newest first

const draft = ref('')
const cmScope = ref<'screen' | 'all'>('screen')
const here = computed(() => (emu.idle ? IDLE_SCENE : scene.value?.id))
const shown = computed(() =>
  [...props.comments.threads.value.filter((t) => cmScope.value === 'all' || t.sceneKey === here.value)].reverse(),
)
async function comment() {
  const text = draft.value
  draft.value = ''
  const ok = await props.comments.post(text, emu.idle ? null : (scene.value ?? null))
  if (!ok) draft.value = text
}

const blockIcon = (b: Block) => (b.type === 'ILLUSTRATION' ? 'brush' : b.type === 'VIDEO' ? 'film' : 'image')

/** The steps of the visit, the one the visitor is in filled. */
const steps = computed(() => stepKeys(props.a))
const here_step = computed(() => {
  if (emu.idle) return 'start'
  const isl = scene.value?.island
  return isl === '@start' ? 'start' : isl === '@end' ? 'end' : isl && steps.value.includes(isl) ? isl : 'start'
})

const card = 'rounded-lg border border-border bg-white p-5 shadow-xs'
const pad = 'flex flex-col items-center justify-center gap-1.5 rounded-md border px-3 py-4 text-center text-[13px] font-bold transition-colors'
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 overflow-y-auto bg-surface-2">
      <!-- The bar: what is being tried, and the way back. -->
      <div class="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-border bg-white px-6 py-3.5">
        <span class="inline-flex items-center gap-1.5 rounded-pill bg-brand-deep/[.08] px-3 py-1 text-[11px] font-extrabold uppercase tracking-overline text-brand-deep">
          <AIcon name="eye" cls="h-3.5 w-3.5" />Test run
        </span>
        <span class="min-w-0 flex-1 truncate text-[16px] font-extrabold">{{ or(a.details.name, 'Untitled experience') }}</span>
        <span class="hidden items-center gap-1.5 rounded-pill bg-surface-2 px-3 py-1 text-[12.5px] font-bold text-secondary-foreground sm:inline-flex">
          <AIcon :name="OUTPUTS[a.details.output].icon" cls="h-3.5 w-3.5" />{{ OUTPUTS[a.details.output].name }}
        </span>
        <button type="button" :class="btnOutline" @click="start"><AIcon name="restart" />Start over</button>
        <button type="button" :class="btnDeep" @click="emit('close')"><AIcon name="left" />Back to editing</button>
      </div>

      <div class="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6">
        <!-- Where in the visit the visitor is. -->
        <nav aria-label="Steps of the visit" class="mb-5 flex flex-wrap items-center gap-1.5">
          <template v-for="(k, i) in steps" :key="k">
            <AIcon v-if="i" name="chev" cls="h-3.5 w-3.5 text-muted-foreground/60" />
            <span
              class="rounded-pill px-3 py-1 text-[12.5px] font-bold"
              :class="k === here_step ? 'bg-brand-deep text-white' : 'bg-white text-secondary-foreground ring-1 ring-border'"
            >
              {{ stepTitle(a, k) }}
            </span>
          </template>
        </nav>

        <div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <!-- The visitor's screen, what just happened, and the comments. -->
          <div class="space-y-4">
            <div v-if="hasDisplay(a)" class="relative aspect-video w-full overflow-hidden rounded-lg bg-[#0b1020] p-8 text-white shadow-md">
              <div
                class="flex h-full items-center justify-center gap-4 text-center"
                :class="emu.idle || alone || !visible.length ? 'flex-col' : 'flex-row [&>*]:max-h-full [&>*]:min-w-0 [&>*]:flex-1 [&>*]:object-contain'"
              >
                <template v-if="emu.idle">
                  <span class="text-[13px] font-extrabold uppercase tracking-[.2em] text-white/50">Waiting</span>
                  <span class="text-3xl font-extrabold leading-tight">Place {{ startName }} to begin</span>
                </template>
                <template v-else-if="visible.length">
                  <template v-for="(b, i) in visible" :key="i">
                    <ScreenPreview v-if="b.type === 'SCREEN'" :a="a" :s="b.content" fill />
                    <div v-else-if="b.type === 'TEXT'" class="text-3xl font-extrabold leading-tight">{{ b.content.text }}</div>
                    <img
                      v-else-if="pic(b.content.url)"
                      :src="pic(b.content.url)"
                      alt=""
                      :class="alone ? 'absolute inset-0 h-full w-full object-contain' : 'max-h-full w-auto rounded-md object-contain'"
                    />
                    <video
                      v-else-if="vid(b.content.url)"
                      :key="emu.sceneId + i"
                      :src="vid(b.content.url)"
                      autoplay
                      playsinline
                      :class="alone ? 'absolute inset-0 h-full w-full object-contain' : 'max-h-full w-auto rounded-md'"
                      @ended="videoEnded"
                    />
                    <div v-else class="flex w-full max-w-sm flex-col items-center gap-2 rounded-md border border-white/15 bg-white/5 px-6 py-8 text-white/50">
                      <AIcon :name="blockIcon(b)" cls="h-8 w-8" /><span class="text-[12px]">{{ mediaName(b.content.url) }}</span>
                    </div>
                  </template>
                </template>
                <span v-else class="text-sm text-white/30">Nothing on the screen</span>
              </div>
              <div
                v-if="emu.reply && !emu.idle"
                class="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center"
                :style="{ background: colorHex(emu.reply.color) + 'f2' }"
              >
                <img v-if="pic(emu.reply.media)" :src="pic(emu.reply.media)" alt="" class="max-h-full w-auto rounded-md object-contain" />
                <div v-else-if="emu.reply.media" class="rounded-md border border-white/30 px-4 py-2 text-[12px] font-bold text-white/80">
                  {{ mediaName(emu.reply.media) }}
                </div>
                <div class="text-3xl font-extrabold leading-tight text-white">{{ emu.reply.text }}</div>
              </div>
            </div>
            <div v-else class="flex aspect-video w-full flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-white p-8 text-center">
              <span class="text-muted-foreground"><AIcon name="audio" cls="h-8 w-8" /></span>
              <span class="text-[13.5px] text-muted-foreground">
                No screen — this experience plays on the Box alone.<br />
                {{ emu.idle ? `The Box is idle. Place ${startName} to begin.` : 'Everything the visitor hears is shown on the Box.' }}
              </span>
            </div>

            <div class="rounded-lg border border-border bg-white shadow-xs">
              <button type="button" class="flex w-full items-center gap-3 px-5 py-3.5 text-left" @click="showLog = !showLog">
                <span class="shrink-0 text-[13.5px] font-extrabold">What just happened</span>
                <span class="min-w-0 flex-1 truncate font-mono text-[12px]" :class="last ? LOG_COLOR[last.kind] : ''">{{ last?.text }}</span>
                <span class="shrink-0 text-[12.5px] font-bold text-brand-deep">{{ showLog ? 'Hide' : 'Show all' }}</span>
              </button>
              <div v-if="showLog" class="space-y-1 border-t border-border px-5 py-3 font-mono text-[12px]">
                <div v-for="(l, i) in emu.log" :key="i" :class="LOG_COLOR[l.kind]">{{ l.text }}</div>
              </div>
            </div>

            <div :class="card">
              <div class="mb-3 flex items-center justify-between gap-2">
                <h2 class="text-[16px] font-extrabold">Comments</h2>
                <span class="inline-flex rounded-md bg-surface-2 p-0.5 text-[12px] font-bold">
                  <button
                    v-for="[k, l] in [['screen', 'This screen'], ['all', `All · ${comments.threads.value.length}`]] as const"
                    :key="k"
                    type="button"
                    class="rounded px-2.5 py-1"
                    :class="cmScope === k ? 'bg-white text-brand-deep shadow-xs' : 'text-muted-foreground hover:text-brand-deep'"
                    @click="cmScope = k"
                  >
                    {{ l }}
                  </button>
                </span>
              </div>
              <textarea
                v-model="draft"
                rows="2"
                :placeholder="`Comment on ${emu.idle ? '“The idle Box”' : '“' + (scene?.name ?? '') + '”'}…`"
                class="w-full resize-y rounded-md border border-input px-3 py-2 text-[14px] outline-none focus:border-brand-deep focus:ring-2 focus:ring-brand-deep/20"
              />
              <div class="mt-2 flex items-center justify-between gap-2">
                <span class="text-[12px] font-bold text-destructive">{{ comments.error.value }}</span>
                <button type="button" :class="btnDeep" :disabled="!draft.trim()" @click="comment">Comment</button>
              </div>
              <div class="mt-3 max-h-[46vh] space-y-2.5 overflow-y-auto">
                <template v-if="shown.length">
                  <CommentThread
                    v-for="t in shown"
                    :key="t.id"
                    :thread="t"
                    :comments="comments"
                    :scene-name="sceneName(a, t.sceneKey)"
                    :show-scene="cmScope === 'all'"
                  />
                </template>
                <p v-else class="text-[13px] text-muted-foreground">{{ cmScope === 'all' ? 'No comments yet.' : 'No comments on this screen yet.' }}</p>
              </div>
            </div>
          </div>

          <!-- The Box, and the scans to place on it. -->
          <div class="space-y-4 lg:sticky lg:top-20">
            <div>
              <h2 class="mb-2 text-[16px] font-extrabold">The Box</h2>
              <div class="rounded-[1.75rem] bg-[#1f2330] p-4 shadow-md">
                <div v-if="boxVideo" class="relative overflow-hidden rounded-xl bg-black" style="aspect-ratio: 16 / 9">
                  <video v-if="vid(boxVideo)" :src="vid(boxVideo)" autoplay muted playsinline class="absolute inset-0 h-full w-full object-cover" />
                  <span v-else class="absolute inset-0 flex items-center justify-center text-white"><AIcon name="play" cls="h-6 w-6" /></span>
                  <span class="absolute bottom-1.5 left-2 rounded-sm bg-black/60 px-1.5 py-0.5 font-mono text-[10.5px] text-[#5eead4]">{{ mediaName(boxVideo) }}</span>
                </div>
                <div v-else class="flex aspect-video items-center justify-center rounded-xl bg-black px-3 text-center font-mono text-[18px] font-bold tracking-wide text-[#5eead4]">
                  {{ emu.idle ? 'IDLE' : (scene?.name ?? '').toUpperCase().slice(0, 22) }}
                </div>
                <div class="mt-3 h-2 rounded-full bg-white/10" />
                <div
                  class="mt-3 flex items-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-bold"
                  :class="emu.sound ? 'bg-brand-cyan/15 text-brand-cyan' : 'bg-white/5 text-white/40'"
                >
                  <AIcon name="audio" />{{ emu.sound ? mediaName(emu.sound) : 'Silent' }}
                </div>
                <div
                  v-if="!hasDisplay(a) && emu.reply && !emu.idle"
                  class="mt-2 rounded-lg px-3 py-3 text-center text-[13px] font-extrabold text-white"
                  :style="{ background: colorHex(emu.reply.color) }"
                >
                  {{ emu.reply.text }}
                </div>
                <template v-if="!emu.idle">
                  <div v-for="(b, i) in audios" :key="i" class="mt-2 flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-[12px] text-white/60">
                    <AIcon name="audio" cls="h-3.5 w-3.5" />{{ mediaName(b.content.url) }}
                  </div>
                </template>
                <div v-if="a.built.variables.length" class="mt-3 flex flex-wrap gap-1.5">
                  <span v-for="(v, k) in emu.state" :key="k" class="rounded-sm bg-white/5 px-2 py-1 font-mono text-[11px] text-white/70">
                    <span class="text-brand-cyan">{{ k }}</span> {{ v }}
                  </span>
                </div>
              </div>
            </div>

            <div :class="card">
              <h2 class="mb-3 text-[16px] font-extrabold">Place a scan on the Box</h2>
              <div class="grid grid-cols-2 gap-2.5">
                <button
                  v-for="[id, what] in ch.objects"
                  :key="id"
                  type="button"
                  :class="[pad, 'border-border bg-white hover:border-brand-deep']"
                  @click="scan(id)"
                >
                  <span class="text-brand-deep"><AIcon name="scan" cls="h-6 w-6" /></span>
                  {{ scanType(a, id).name }}
                  <span class="text-[11.5px] font-semibold text-muted-foreground">{{ what }}</span>
                </button>
                <button v-for="id in others" :key="id" type="button" :class="[pad, 'border-border bg-white text-muted-foreground/70 hover:border-brand-deep/50']" @click="scan(id)">
                  <span class="opacity-50"><AIcon name="scan" cls="h-6 w-6" /></span>
                  {{ scanType(a, id).name }}
                </button>
              </div>
              <p class="mt-3 text-[12px] text-muted-foreground">{{ ch.other ? 'Anything else: ' + ch.other : 'Anything else does nothing here.' }}</p>
              <div v-if="ch.video.length || ch.timed.length" class="mt-4 space-y-2 border-t border-border pt-4">
                <button
                  v-for="v in ch.video"
                  :key="v.key"
                  type="button"
                  class="flex w-full items-center gap-2.5 rounded-md border border-border px-3 py-2.5 text-left text-[13px] font-bold hover:border-brand-deep"
                  @click="fireKey(v.key, 'The video ends')"
                >
                  <span class="text-brand-deep"><AIcon name="film" /></span>
                  <span>The video ends<span class="block text-[11.5px] font-semibold text-muted-foreground">{{ v.what }}</span></span>
                </button>
                <button
                  v-for="t in ch.timed"
                  :key="t.key"
                  type="button"
                  class="flex w-full items-center gap-2.5 rounded-md border border-border px-3 py-2.5 text-left text-[13px] font-bold hover:border-brand-deep"
                  @click="fireKey(t.key, `${t.seconds} seconds pass`)"
                >
                  <span class="text-brand-deep"><AIcon name="timer" /></span>
                  <span>{{ t.seconds }} seconds pass<span class="block text-[11.5px] font-semibold text-muted-foreground">{{ t.what }}</span></span>
                </button>
              </div>
              <p v-if="!ch.objects.size && !ch.video.length && !ch.timed.length && !ch.other" class="mt-3 text-[12.5px] font-bold text-warning">
                Nothing moves the visitor on from here. Check its rules.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
