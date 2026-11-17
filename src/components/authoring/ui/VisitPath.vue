<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { linkInfo, type Authoring, type FixRow } from '@/lib/authoring/engine'
import { stepBrief, stepSentence, stepThumb } from '@/lib/authoring/summary'
import { stepGlyph, stepKeys, stepTitle, stepTone } from '@/lib/authoring/tone'
import AIcon from '../AIcon.vue'

/**
 * The visit, start to end, as one row under the experience header: the only place the steps are
 * listed. Each step is a tile (what it does, its picture, ready or how many things to fix); between
 * two tiles, how the visitor moves on and a "+" that adds an activity there. The open step is ringed.
 * Every tile has one size whichever is open, so the header never moves.
 */
const props = defineProps<{
  a: Authoring
  current: string | null
  base: string
  fixes: FixRow[]
  /** Open comments on one step. */
  comments: (key: string) => number
}>()
const emit = defineEmits<{ link: [fromKey: string]; add: [at: number] }>()
const router = useRouter()

const keys = computed(() => stepKeys(props.a))
const missingOf = (k: string) => props.fixes.filter((r) => r.key === k)

/** The hand-over between two tiles, as short as it can be said. */
function handOver(k: string) {
  const l = linkInfo(props.a, k)
  const plain = l.short.replace(/<[^>]*>/g, '')
  const text = plain
    .replace(/^after (\d+) s$/, '$1 s')
    .replace(/^right away$/, 'at once')
    .replace(/^when the video ends$/, 'video ends')
    .replace(/^when (.*) is placed$/, 'scan')
  return { text, title: l.warn || `Then ${plain}`, warn: !!l.warn }
}

// ── scrolling, when the steps are wider than the row ──
const scroller = ref<HTMLElement | null>(null)
const canLeft = ref(false)
const canRight = ref(false)
function measure() {
  const el = scroller.value
  if (!el) return
  canLeft.value = el.scrollLeft > 4
  canRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 4
}
function page(dir: 1 | -1) {
  const el = scroller.value
  if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' })
}
/** Brings the open step into view inside the row, without scrolling the page. */
function reveal() {
  const el = scroller.value
  const tile = el?.querySelector<HTMLElement>('[aria-current="step"]')
  if (!el || !tile) return
  const left = tile.offsetLeft - el.offsetLeft
  if (left < el.scrollLeft || left + tile.offsetWidth > el.scrollLeft + el.clientWidth)
    el.scrollTo({ left: Math.max(0, left - (el.clientWidth - tile.offsetWidth) / 2), behavior: 'smooth' })
}
let ro: ResizeObserver | null = null
onMounted(() => {
  ro = new ResizeObserver(measure)
  if (scroller.value) ro.observe(scroller.value)
  nextTick(() => {
    reveal()
    measure()
  })
})
onBeforeUnmount(() => ro?.disconnect())
watch(() => props.current, () => nextTick(reveal))
watch(() => keys.value.length, () => nextTick(measure))

/** Fades whichever edge has more steps beyond it. */
const mask = computed(() => {
  const l = canLeft.value ? 'transparent, #000 56px' : '#000, #000'
  const r = canRight.value ? '#000 calc(100% - 56px), transparent' : '#000, #000'
  const g = `linear-gradient(to right, ${l}, ${r})`
  return { maskImage: g, WebkitMaskImage: g }
})
</script>

<template>
  <nav aria-label="Steps of the visit" class="relative">
    <ol ref="scroller" class="-m-1 flex overflow-x-auto p-1 [scrollbar-width:none]" :style="mask" @scroll.passive="measure">
      <template v-for="(k, i) in keys" :key="k">
        <li class="w-[200px] shrink-0 sm:w-[224px]">
          <button
            type="button"
            :aria-current="k === current ? 'step' : undefined"
            :title="[stepSentence(a, k).replace(/<[^>]*>/g, ''), ...missingOf(k).map((r) => `• ${r.gap}`)].join('\n')"
            class="flex h-full w-full flex-col rounded-lg border bg-white p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-deep/50"
            :class="k === current ? 'border-brand-deep ring-1 ring-inset ring-brand-deep' : 'border-border hover:border-foreground/25'"
            @click="router.push(`${base}/step/${k}`)"
          >
            <div class="flex w-full items-center gap-2">
              <span :style="{ color: stepTone(a, k)[0] }"><AIcon :name="stepGlyph(a, k)" cls="h-5 w-5" /></span>
              <span class="text-[12px] tabular-nums text-muted-foreground">{{ i + 1 }}</span>
              <span class="min-w-0 truncate text-[14px] font-semibold" :class="k === current && 'text-brand-deep'">{{ stepTitle(a, k) }}</span>
              <span
                v-if="comments(k)"
                :title="`${comments(k)} open comment${comments(k) === 1 ? '' : 's'}`"
                class="inline-flex shrink-0 items-center gap-0.5 text-[12px] font-medium text-muted-foreground"
              >
                <AIcon name="chat" cls="h-3.5 w-3.5" />{{ comments(k) }}
              </span>
              <img
                v-if="stepThumb(a, k)"
                :src="stepThumb(a, k)"
                alt=""
                class="ml-auto aspect-video w-10 shrink-0 rounded-sm bg-surface-2 object-cover"
              />
            </div>
            <div class="mt-1.5 flex items-center gap-1.5 text-[12px] font-medium">
              <template v-if="missingOf(k).length">
                <span class="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden="true" />
                <span class="text-warning">{{ missingOf(k).length }} to fix</span>
              </template>
              <template v-else>
                <AIcon name="check" cls="h-3.5 w-3.5 text-success" />
                <span class="text-success">Ready</span>
              </template>
            </div>
            <p class="mt-1 line-clamp-2 h-10 text-[13px] leading-5 text-secondary-foreground" v-html="stepBrief(a, k)" />
          </button>
        </li>

        <!-- Between two steps: how the visitor moves on, and a place to add an activity. -->
        <li v-if="k !== 'end'" class="group/conn relative w-16 shrink-0">
          <span aria-hidden="true" class="absolute inset-x-0 top-[23px] h-px bg-foreground/15" />
          <button
            type="button"
            :title="handOver(k).title"
            class="absolute left-1/2 top-[23px] max-w-[52px] -translate-x-1/2 -translate-y-1/2 truncate rounded-pill bg-white px-1.5 py-px text-[11px] font-medium tabular-nums ring-1 ring-border hover:text-brand-deep hover:ring-brand-deep"
            :class="handOver(k).warn ? 'text-warning' : 'text-muted-foreground'"
            @click="emit('link', k)"
          >
            {{ handOver(k).text }}
          </button>
          <button
            type="button"
            :title="`Add an activity after ${stepTitle(a, k)}`"
            :aria-label="`Add an activity after ${stepTitle(a, k)}`"
            class="absolute inset-x-0 top-[44px] mx-auto flex h-6 w-6 items-center justify-center rounded-full border border-border bg-white text-muted-foreground opacity-40 transition-opacity hover:border-brand-deep hover:text-brand-deep focus-visible:opacity-100 group-hover/conn:opacity-100 [@media(hover:none)]:opacity-100"
            @click="emit('add', i)"
          >
            <AIcon name="plus" cls="h-3.5 w-3.5" />
          </button>
        </li>
      </template>
    </ol>

    <button
      v-if="canLeft"
      type="button"
      aria-label="Earlier steps"
      class="absolute left-1 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-white/90 text-secondary-foreground shadow-xs hover:text-brand-deep sm:flex"
      @click="page(-1)"
    >
      <AIcon name="left" />
    </button>
    <button
      v-if="canRight"
      type="button"
      aria-label="Later steps"
      class="absolute right-1 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-white/90 text-secondary-foreground shadow-xs hover:text-brand-deep sm:flex"
      @click="page(1)"
    >
      <AIcon name="chev" />
    </button>
  </nav>
</template>
