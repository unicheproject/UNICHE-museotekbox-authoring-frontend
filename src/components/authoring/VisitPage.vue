<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { hasDisplay, linkInfo, mediaOf, num, scanType, scenesOf, template, type Authoring, type FixRow } from '@/lib/authoring/engine'
import { chip } from '@/lib/authoring/html'
import { thumbOf } from '@/lib/authoring/media'
import { stepGlyph, stepKeys, stepTitle, stepTone } from '@/lib/authoring/tone'
import AIcon from './AIcon.vue'

/**
 * An experience's own page: what is left before it can be published, then the visit top to bottom —
 * the Start, each activity, the End — one numbered card per step on a line, with how the visitor
 * moves on between every two. A card opens its step on a page of its own.
 */
const props = defineProps<{
  a: Authoring
  name: string
  published: boolean
  saving: boolean
  saveError: boolean
  fixes: FixRow[]
  /** Open comments, of one step or (no key) of all. */
  comments: (key?: string) => number
}>()
const emit = defineEmits<{
  step: [key: string]
  link: [fromKey: string]
  add: [at: number]
  comments: []
  settings: []
  test: []
  publish: []
}>()

const router = useRouter()

const keys = computed(() => stepKeys(props.a))
const missingOf = (k: string) => props.fixes.filter((r) => r.key === k)
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

function fix(r: FixRow) {
  if (r.link) emit('link', r.key)
  else emit('step', r.key)
}

/** What a step does, in one sentence (may carry markup; names are escaped by the engine). */
function sentence(k: string) {
  const a = props.a
  const d = a.details
  if (k === 'start')
    return d.startCard
      ? `The visit starts when the visitor places the ${chip(scanType(a, d.startCard))}.`
      : 'The visit starts when the visitor places a scan.'
  if (k === 'end')
    return d.goodbye
      ? `A goodbye for ${num(d.endSeconds) || 10} seconds, then the Box waits for the next visitor.`
      : 'The Box waits for the next visitor.'
  const isl = a.islands.find((x) => x.key === k)
  if (!isl) return ''
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`
  const cfg = isl.cfg
  switch (isl.templateId) {
    case 'quiz':
      return `${plural((cfg.questions || []).length, 'question')}. The visitor answers by placing a scan.`
    case 'guided':
      return `${plural((cfg.chapters || []).length, 'chapter')}, one after another.`
    case 'scan-discover':
      return `${plural((cfg.objects || []).length, 'object')}, one after another.`
    case 'treasure':
      return `${plural((cfg.clues || []).length, 'clue')}, one after another.`
    case 'scratch':
      return 'Built in Scenes and rules.'
    default:
      return template(isl.templateId).summary(a, cfg)
  }
}

/** The picture a step shows first, if it shows one. */
function thumb(k: string): string | undefined {
  const a = props.a
  if (!hasDisplay(a)) return undefined
  if (k === 'start') {
    const m = mediaOf(a.details.welcomeMedia)
    return m && m.kind === 'IMAGE' ? thumbOf(m.id) : undefined
  }
  const id = scenesOf(a, k)
    .flatMap((sc) => sc.blocks)
    .map((b) => (b.type === 'IMAGE' ? b.content?.mediaId : null))
    .find((x): x is string => typeof x === 'string')
  return id ? thumbOf(id) : undefined
}

/** The pill between two steps: what the visitor waits for. */
function handOver(k: string) {
  const l = linkInfo(props.a, k)
  const icon = l.link.how === 'time' ? 'timer' : l.link.how === 'now' ? 'fast' : l.link.how === 'video' ? 'film' : 'scan'
  return { icon, html: `Then ${l.short.replace(/^after (\d+) s$/, 'after <b>$1 seconds</b>')}`, warn: !!l.warn }
}

const btnOutline =
  'inline-flex items-center justify-center gap-2 rounded-md border border-input bg-white px-4 py-2.5 text-[12px] font-extrabold uppercase tracking-button text-secondary-foreground hover:border-brand-deep hover:text-brand-deep'
const btnDeep =
  'inline-flex items-center justify-center gap-2 rounded-md bg-brand-deep px-4 py-2.5 text-[12px] font-extrabold uppercase tracking-button text-white hover:bg-brand-deep/90'
const btnGrad =
  'inline-flex items-center justify-center gap-2 rounded-md bg-grad-brand px-4 py-2.5 text-[12px] font-extrabold uppercase tracking-button text-white shadow-md transition-transform hover:-translate-y-0.5'
</script>

<template>
  <!-- Past laptop size (route meta `wide`) the visit fills the width instead of a column in the middle. -->
  <div class="mx-auto max-w-[820px] min-[1700px]:max-w-[1280px]">
    <nav aria-label="You are here" class="mb-3 flex items-center gap-1.5 text-[13px] font-semibold">
      <button type="button" class="text-muted-foreground hover:text-brand-deep hover:underline" @click="router.push('/experiences')">
        Experiences
      </button>
      <AIcon name="chev" cls="h-3.5 w-3.5 text-muted-foreground/60" />
      <span aria-current="page" class="max-w-[260px] truncate text-foreground">{{ name }}</span>
    </nav>

    <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div class="min-w-0">
        <h1 class="text-2xl font-extrabold leading-tight tracking-tight">{{ name }}</h1>
        <div class="mt-1.5 flex items-center gap-2 text-[13.5px] text-muted-foreground">
          <span v-if="published" class="font-bold text-success">Published</span>
          <span v-else class="font-bold text-secondary-foreground">Draft</span>
          <template v-if="!saveError">
            <span>·</span>
            <span class="inline-flex items-center gap-1.5" aria-live="polite">
              <template v-if="saving">
                <span class="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground/40 border-t-muted-foreground" />Saving…
              </template>
              <template v-else><AIcon name="check" cls="h-3.5 w-3.5 text-success" />Saved</template>
            </span>
          </template>
        </div>
      </div>
      <div class="flex flex-wrap gap-2.5">
        <button type="button" :class="btnOutline" @click="emit('comments')">
          <AIcon name="chat" />Comments
          <span v-if="comments()" class="rounded-pill bg-brand-deep px-2 py-0.5 text-[12px] text-white">{{ comments() }}</span>
        </button>
        <button type="button" :class="btnOutline" @click="emit('settings')"><AIcon name="gear" />Settings</button>
        <button type="button" :class="btnOutline" @click="emit('test')"><AIcon name="play" />Try it</button>
        <button type="button" :class="btnGrad" @click="emit('publish')">Publish</button>
      </div>
    </div>

    <div
      v-if="fixes.length"
      class="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 sm:gap-4 sm:px-6 sm:py-5"
    >
      <span class="text-warning"><AIcon name="alert" cls="h-7 w-7" /></span>
      <div class="min-w-[180px] flex-1">
        <div class="text-[15px] font-extrabold">
          {{ fixes.length }} thing{{ fixes.length === 1 ? '' : 's' }} left before you can publish
        </div>
        <div class="text-[13.5px] text-secondary-foreground">Next: {{ fixes[0].where }}: {{ lower(fixes[0].gap) }}</div>
      </div>
      <button type="button" :class="[btnDeep, 'w-full sm:w-auto']" @click="fix(fixes[0])">Fix it<AIcon name="arrow" /></button>
    </div>
    <div
      v-else
      class="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 sm:gap-4 sm:px-6 sm:py-5"
    >
      <span class="text-success"><AIcon name="checkc" cls="h-7 w-7" /></span>
      <div class="flex-1 text-[15px] font-extrabold">Ready to publish</div>
      <button type="button" :class="btnGrad" @click="emit('publish')">Publish</button>
    </div>

    <ol class="relative pb-12">
      <span class="absolute bottom-16 left-[17px] top-10 w-[3px] rounded bg-brand-deep/15" />
      <template v-for="(k, i) in keys" :key="k">
        <li class="relative flex gap-4">
          <span
            class="relative z-10 mt-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[14px] font-extrabold ring-4 ring-surface-2"
            :class="missingOf(k).length ? 'bg-amber-100 text-warning' : 'bg-brand-deep text-white'"
          >
            {{ i + 1 }}
          </span>
          <button
            type="button"
            class="flex min-w-0 flex-1 items-center gap-4 rounded-lg border bg-white p-4 text-left min-[1700px]:gap-6 min-[1700px]:p-6 shadow-xs transition-all hover:border-brand-deep hover:shadow-md"
            :class="missingOf(k).length ? 'border-amber-300' : 'border-transparent'"
            @click="emit('step', k)"
          >
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2.5">
                <span
                  class="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl min-[1700px]:h-9 min-[1700px]:w-9"
                  :style="{ color: stepTone(a, k)[0], background: stepTone(a, k)[1] }"
                >
                  <AIcon :name="stepGlyph(a, k)" cls="h-3.5 w-3.5" />
                </span>
                <span class="text-[16px] font-extrabold min-[1700px]:text-[18px]">{{ stepTitle(a, k) }}</span>
                <span
                  v-if="comments(k)"
                  class="inline-flex items-center gap-1 rounded-pill bg-brand-deep/[.08] px-2 py-0.5 text-[11.5px] font-bold text-brand-deep"
                >
                  <AIcon name="chat" cls="h-3 w-3" />{{ comments(k) }} comment{{ comments(k) === 1 ? '' : 's' }}
                </span>
              </div>
              <p class="mt-2 text-[14px] leading-relaxed text-secondary-foreground min-[1700px]:text-[15px]" v-html="sentence(k)" />
              <p v-if="missingOf(k).length" class="mt-2 flex items-center gap-2 text-[13.5px] font-bold text-warning">
                <AIcon name="alert" />Not finished: {{ lower(missingOf(k)[0].gap)
                }}<template v-if="missingOf(k).length > 1"> (and {{ missingOf(k).length - 1 }} more)</template>
              </p>
            </div>
            <!-- The whole picture at 16:9, never cropped, so what is written on it can be read. -->
            <img
              v-if="thumb(k)"
              :src="thumb(k)"
              alt=""
              class="hidden aspect-video w-32 shrink-0 rounded-md bg-surface-2 object-contain ring-1 ring-border md:block min-[1700px]:w-64 min-[1700px]:rounded-lg"
            />
            <span :class="[btnOutline, 'hidden shrink-0 sm:inline-flex']">Edit</span>
          </button>
        </li>

        <template v-if="k !== 'end'">
          <li class="relative flex items-center gap-4 py-3">
            <span class="w-9 shrink-0" />
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-pill bg-white px-4 py-2 text-[13.5px] font-semibold shadow-xs ring-1 hover:ring-brand-deep"
              :class="handOver(k).warn ? 'text-warning ring-amber-300' : 'text-secondary-foreground ring-border'"
              @click="emit('link', k)"
            >
              <AIcon :name="handOver(k).icon" cls="h-4 w-4 text-muted-foreground" />
              <span v-html="handOver(k).html" />
            </button>
          </li>
          <li v-if="keys[i + 1] === 'end'" class="flex gap-4 pb-3">
            <span class="w-9 shrink-0" />
            <button
              type="button"
              class="flex flex-1 items-center justify-center gap-2 rounded-lg border border-dashed border-brand-deep/30 bg-white/60 py-5 text-[14px] font-extrabold text-brand-deep hover:border-brand-deep hover:bg-white"
              @click="emit('add', a.islands.length)"
            >
              <AIcon name="plus" cls="h-5 w-5" />Add an activity
            </button>
          </li>
        </template>
      </template>
    </ol>

  </div>
</template>
