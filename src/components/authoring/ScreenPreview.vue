<script setup lang="ts">
import { computed } from 'vue'
import {
  LETTERS,
  SCREEN_PRESETS,
  answerHex,
  answerLetter,
  mediaOf,
  presetOf,
  scanName,
  type Authoring,
  type Cfg,
} from '@/lib/authoring/engine'
import { thumbOf } from '@/lib/authoring/media'
import './screens.css'

/**
 * One ready-made question screen, drawn at any size: a layout thumbnail (`sample`), the editor's
 * preview (`mark` ticks the right answer), or a question card's thumbnail.
 */
const props = defineProps<{ a: Pick<Authoring, 'scanTypes'>; s: Cfg; sample?: boolean; mark?: boolean; fill?: boolean }>()

const p = computed(() => presetOf(props.s.screen) || SCREEN_PRESETS[0])
const answers = computed<Cfg[]>(() => (props.s.answers || []).slice(0, 4))
const isVideo = computed(() => p.value.media === 'VIDEO')

/** A picture shows itself; a video or a missing picture shows a labelled placeholder. */
function picture(v: string | undefined) {
  const m = mediaOf(v)
  return m?.kind === 'IMAGE' ? thumbOf(m.id) : undefined
}
const text = (ans: Cfg, k: number) => ans.text || (props.sample ? '' : 'Answer ' + LETTERS[k])
const object = (ans: Cfg) => (ans.scan && !props.sample ? scanName(props.a, ans.scan) : '')
const ok = (k: number) => props.mark && props.s.right === k
</script>

<template>
  <div class="stw" :class="{ fill }">
    <div class="st" :class="'st-' + p.id">
      <!-- The picture or video the layout puts first. -->
      <div v-if="p.media && p.id !== 'corners'" class="st-m st-main">
        <img v-if="!isVideo && picture(s.screenMedia)" :src="picture(s.screenMedia)" alt="" />
        <span v-else class="st-ph">{{ isVideo ? 'Video' : 'Picture' }}</span>
        <span v-if="isVideo" class="st-play"><span>▶</span></span>
      </div>

      <!-- "Picture beside" stacks the words and answers in a column next to the picture. -->
      <div :class="p.id === 'picside' ? 'st-col' : 'contents'">
        <div class="st-q">
          {{ s.ask || (sample ? '' : 'Your question') }}<span v-if="sample && !s.ask" class="st-bar" />
        </div>

        <!-- Four corners puts each answer in its own corner; every other layout lines them up. -->
        <template v-if="p.id === 'corners'">
          <div
            v-for="(ans, k) in answers"
            :key="k"
            class="st-a"
            :class="['c' + (k + 1), { ok: ok(k) }]"
            :style="{ '--c': answerHex(a, ans) }"
          >
            <span class="st-l">{{ answerLetter(ans, k) }}</span><span class="st-t">{{ text(ans, k) }}</span>
            <span v-if="object(ans)" class="st-o">{{ object(ans) }}</span>
            <span v-if="ok(k)" class="st-ok">✓</span>
          </div>
        </template>
        <div v-else class="st-ans">
          <div v-for="(ans, k) in answers" :key="k" class="st-a" :class="{ ok: ok(k) }" :style="{ '--c': answerHex(a, ans) }">
            <template v-if="p.pictures">
              <div class="st-m">
                <img v-if="picture(ans.media)" :src="picture(ans.media)" alt="" />
                <span v-else class="st-ph">Picture</span>
              </div>
              <div class="st-cap">
                <span class="st-l">{{ answerLetter(ans, k) }}</span><span class="st-t">{{ text(ans, k) }}</span>
                <span v-if="object(ans)" class="st-o">{{ object(ans) }}</span>
              </div>
            </template>
            <template v-else>
              <span class="st-l">{{ answerLetter(ans, k) }}</span><span class="st-t">{{ text(ans, k) }}</span>
              <span v-if="object(ans)" class="st-o">{{ object(ans) }}</span>
            </template>
            <span v-if="ok(k)" class="st-ok">✓</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
