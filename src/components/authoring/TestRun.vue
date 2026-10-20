<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { OUTPUTS, colorHex, hasDisplay, mediaName, mediaOf, or, scanName, scanType, type Authoring, type Block } from '@/lib/authoring/engine'
import { createEmulator, type LogKind } from '@/lib/authoring/emulator'
import { loadMediaUrl, thumbOf } from '@/lib/authoring/media'
import AIcon from './AIcon.vue'
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
  scan: 'text-brand-cyan',
  rule: 'text-white/60',
  goto: 'text-white',
  state: 'text-[#fbbf24]',
  box: 'text-[#5eead4]',
  none: 'text-white/40',
  sys: 'text-brand-pink',
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

const panel = 'rounded-lg bg-white/5 p-4'
const overline = 'text-[10px] font-extrabold uppercase tracking-overline'
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 overflow-y-auto p-4 [scrollbar-color:rgba(255,255,255,.18)_transparent] [scrollbar-width:thin] sm:p-6 lg:overflow-hidden"
      style="background-color: rgb(17, 24, 39)"
    >
      <div class="mx-auto flex w-full max-w-6xl flex-col gap-4 lg:h-full">
        <div class="flex shrink-0 items-center justify-between text-white">
          <div class="flex items-center gap-3">
            <span class="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-overline text-white/60">
              <span class="h-2 w-2 rounded-pill bg-brand-cyan" />Test run
            </span>
            <span class="text-[14px] font-extrabold">{{ or(a.details.name, 'Untitled experience') }}</span>
            <span class="text-[11px] font-bold text-white/45">{{ OUTPUTS[a.details.output].name }}</span>
          </div>
          <div class="flex gap-2">
            <button type="button" class="rounded-md border border-white/25 px-3 py-1.5 text-[12px] font-bold text-white hover:bg-white/10" @click="start">
              Start over
            </button>
            <button type="button" title="Close" class="rounded-md border border-white/25 p-1.5 text-white hover:bg-white/10" @click="emit('close')">
              <AIcon name="x" />
            </button>
          </div>
        </div>

        <div class="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_340px]">
          <!-- The visit: the screen, what the Box waits for, what just happened. -->
          <div class="flex flex-col gap-4 [scrollbar-color:rgba(255,255,255,.18)_transparent] [scrollbar-width:thin] lg:min-h-0 lg:overflow-y-auto lg:pr-1">
            <div v-if="hasDisplay(a)" class="relative aspect-video w-full shrink-0 overflow-hidden rounded-lg bg-black p-8 text-white shadow-lg">
              <div
                class="flex h-full items-center justify-center gap-4 text-center"
                :class="emu.idle || alone || !visible.length ? 'flex-col' : 'flex-row [&>*]:max-h-full [&>*]:min-w-0 [&>*]:flex-1 [&>*]:object-contain'"
              >
                <span v-if="emu.idle" class="text-[13px] font-bold text-white/40">
                  The Box is idle and open.<br />Place {{ startName }} to begin.
                </span>
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
            <div
              v-else
              class="flex aspect-video w-full shrink-0 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-white/15 bg-white/[.03] p-8 text-center"
            >
              <span class="text-white/25"><AIcon name="audio" cls="h-8 w-8" /></span>
              <span class="text-[12.5px] text-white/40">
                No screen — this experience plays on the Box alone.<br />
                {{ emu.idle ? `The Box is idle. Place ${startName} to begin.` : 'Everything the visitor hears is shown on the Box panel.' }}
              </span>
            </div>

            <div :class="panel">
              <span :class="[overline, 'text-white/60']">
                {{ emu.idle ? 'The idle Box is waiting for' : `On “${scene?.name}”, the Box is waiting for` }}
              </span>
              <div class="mt-2 flex flex-wrap gap-2">
                <button
                  v-for="[id, what] in ch.objects"
                  :key="id"
                  type="button"
                  class="flex items-center gap-2 rounded-md border border-white/25 bg-white/10 px-3 py-2 text-left text-[12.5px] font-bold text-white transition-colors hover:border-brand-cyan"
                  @click="scan(id)"
                >
                  <span class="h-2.5 w-2.5 shrink-0 rounded-pill" :style="{ background: scanType(a, id).swatch }" />
                  <span>{{ scanType(a, id).name }}<span class="block text-[11px] font-semibold text-white/55">{{ what }}</span></span>
                </button>
                <button
                  v-for="v in ch.video"
                  :key="v.key"
                  type="button"
                  class="flex items-center gap-2 rounded-md border border-white/25 bg-white/10 px-3 py-2 text-left text-[12.5px] font-bold text-white hover:border-brand-cyan"
                  @click="fireKey(v.key, 'The video ends')"
                >
                  <span class="text-brand-cyan"><AIcon name="film" cls="h-3.5 w-3.5" /></span>
                  <span>The video ends<span class="block text-[11px] font-semibold text-white/55">{{ v.what }}</span></span>
                </button>
                <button
                  v-for="t in ch.timed"
                  :key="t.key"
                  type="button"
                  class="flex items-center gap-2 rounded-md border border-white/25 bg-white/10 px-3 py-2 text-left text-[12.5px] font-bold text-white hover:border-brand-cyan"
                  @click="fireKey(t.key, `${t.seconds} seconds pass`)"
                >
                  <span class="text-brand-cyan"><AIcon name="timer" cls="h-3.5 w-3.5" /></span>
                  <span>{{ t.seconds }} seconds pass<span class="block text-[11px] font-semibold text-white/55">{{ t.what }}</span></span>
                </button>
                <span v-if="!ch.objects.size && !ch.video.length && !ch.timed.length && !ch.other" class="text-[12px] text-white/40">
                  Nothing — this screen has no way on. Check its rules.
                </span>
              </div>
              <div :class="[overline, 'mt-4 text-white/40']">{{ ch.other ? 'Anything else: ' + ch.other : 'Anything else does nothing here' }}</div>
              <div class="mt-2 flex flex-wrap gap-2">
                <button
                  v-for="id in others"
                  :key="id"
                  type="button"
                  class="flex items-center gap-2 rounded-md border border-dashed border-white/15 px-3 py-2 text-left text-[12.5px] font-bold text-white/45 transition-colors hover:border-white/40 hover:text-white"
                  @click="scan(id)"
                >
                  <span class="h-2.5 w-2.5 shrink-0 rounded-pill" :style="{ background: scanType(a, id).swatch }" />{{ scanType(a, id).name }}
                </button>
              </div>
            </div>

            <div class="rounded-lg bg-white/5">
              <button type="button" class="flex w-full items-center gap-3 px-4 py-3 text-left" @click="showLog = !showLog">
                <span :class="[overline, 'shrink-0 text-white/50']">What just happened</span>
                <span class="min-w-0 flex-1 truncate font-mono text-[11.5px]" :class="last ? LOG_COLOR[last.kind] : ''">{{ last?.text }}</span>
                <span class="shrink-0 text-[11px] font-bold text-brand-cyan">{{ showLog ? 'Hide' : 'Show all' }}</span>
              </button>
              <div v-if="showLog" class="space-y-1 border-t border-white/10 px-4 py-3 font-mono text-[11.5px]">
                <div v-for="(l, i) in emu.log" :key="i" :class="LOG_COLOR[l.kind]">{{ l.text }}</div>
              </div>
            </div>
          </div>

          <!-- The Box: its own display, its sound, and the score. -->
          <div class="flex flex-col gap-4 lg:min-h-0">
            <div :class="[panel, 'shrink-0']">
              <div :class="[overline, 'mb-2 text-white/50']">The Box</div>
              <div v-if="boxVideo" class="relative overflow-hidden rounded-md bg-black" style="aspect-ratio: 16 / 9">
                <video v-if="vid(boxVideo)" :src="vid(boxVideo)" autoplay muted playsinline class="absolute inset-0 h-full w-full object-cover" />
                <span v-else class="absolute inset-0 flex items-center justify-center text-white"><AIcon name="play" cls="h-6 w-6" /></span>
                <span class="absolute bottom-1.5 left-2 rounded-sm bg-black/60 px-1.5 py-0.5 font-mono text-[10.5px] text-[#5eead4]">
                  {{ mediaName(boxVideo) }}
                </span>
              </div>
              <div v-else class="rounded-md bg-[#0c1b16] px-3 py-3 text-center font-mono text-[13px] leading-snug text-[#5eead4]">
                {{ emu.idle ? 'IDLE' : (scene?.name ?? '').toUpperCase().slice(0, 22) }}
              </div>
              <div
                class="mt-2 flex items-center gap-2 rounded-md px-3 py-2 text-[12px] font-bold"
                :class="emu.sound ? 'bg-brand-cyan/15 text-brand-cyan' : 'bg-white/5 text-white/30'"
              >
                <AIcon name="audio" cls="h-3.5 w-3.5" />{{ emu.sound ? mediaName(emu.sound) : 'silent' }}
              </div>
              <div
                v-if="!hasDisplay(a) && emu.reply && !emu.idle"
                class="mt-2 rounded-md px-3 py-3 text-center text-[13px] font-extrabold text-white"
                :style="{ background: colorHex(emu.reply.color) }"
              >
                {{ emu.reply.text }}
              </div>
              <template v-if="!emu.idle">
                <div
                  v-for="(b, i) in audios"
                  :key="i"
                  class="mt-2 flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-[11.5px] text-white/60"
                >
                  <AIcon name="audio" cls="h-3.5 w-3.5" />{{ mediaName(b.content.url) }}
                </div>
              </template>
              <div v-if="a.built.variables.length" class="mt-3 flex flex-wrap gap-1.5">
                <span v-for="(v, k) in emu.state" :key="k" class="rounded-sm bg-white/5 px-2 py-1 font-mono text-[11px] text-white/70">
                  <span class="text-brand-cyan">{{ k }}</span> {{ v }}
                </span>
              </div>
            </div>

            <div class="flex min-h-[22rem] flex-col rounded-lg bg-white/5 lg:min-h-0 lg:flex-1">
              <div class="shrink-0 p-4 pb-3">
                <div class="mb-2 flex items-center justify-between gap-2">
                  <span :class="[overline, 'text-white/60']">Comments</span>
                  <span class="inline-flex rounded-md bg-white/5 p-0.5 text-[11px] font-bold">
                    <button
                      v-for="[k, l] in [['screen', 'This screen'], ['all', `All · ${comments.threads.value.length}`]] as const"
                      :key="k"
                      type="button"
                      class="rounded px-2 py-1"
                      :class="cmScope === k ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white'"
                      @click="cmScope = k"
                    >
                      {{ l }}
                    </button>
                  </span>
                </div>
                <textarea
                  v-model="draft"
                  rows="2"
                  :placeholder="`Comment on ${emu.idle ? 'the idle Box' : '“' + (scene?.name ?? '') + '”'}…`"
                  class="w-full resize-none rounded-md border border-white/15 bg-white/5 px-3 py-2 text-[13px] text-white outline-none placeholder:text-white/35 focus:border-brand-cyan"
                />
                <div class="mt-2 flex items-center justify-between gap-2">
                  <span class="text-[11px] font-bold text-brand-pink">{{ comments.error.value }}</span>
                  <button
                    type="button"
                    class="rounded-md bg-white px-3 py-1.5 text-[12px] font-extrabold text-surface-dark hover:bg-white/90 disabled:opacity-40"
                    :disabled="!draft.trim()"
                    @click="comment"
                  >
                    Comment
                  </button>
                </div>
              </div>
              <div
                class="min-h-0 flex-1 space-y-2 overflow-y-auto border-t border-white/10 p-4 pt-3 [scrollbar-color:rgba(255,255,255,.18)_transparent] [scrollbar-width:thin]"
              >
                <template v-if="shown.length">
                  <CommentThread
                    v-for="t in shown"
                    :key="t.id"
                    :thread="t"
                    :comments="comments"
                    :scene-name="sceneName(a, t.sceneKey)"
                    :show-scene="cmScope === 'all'"
                    dark
                  />
                </template>
                <p v-else class="text-[12px] text-white/35">{{ cmScope === 'all' ? 'No comments yet.' : 'No comments on this screen yet.' }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
