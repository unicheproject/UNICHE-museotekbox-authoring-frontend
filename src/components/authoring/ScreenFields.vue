<script setup lang="ts">
import { computed } from 'vue'
import { LETTERS, SCREEN_PRESETS, answerHex, answersFor, presetOf, scanType, usesScreen, type Authoring, type Cfg } from '@/lib/authoring/engine'
import { inputCls } from '@/lib/authoring/html'
import AField from './AField.vue'
import AIcon from './AIcon.vue'
import MediaPicker from './MediaPicker.vue'
import ScreenPreview from './ScreenPreview.vue'
import SwatchRow from './SwatchRow.vue'
import TypeSelect from './TypeSelect.vue'

/**
 * A question's screen: its own picture, video or drawing, or one of eight
 * ready-made screens — the question in words and up to four answers, each picked by placing its
 * object. `picker` shows only the choice of layout; `fields` the rest once a layout is chosen.
 */
const props = defineProps<{ a: Authoring; q: Cfg; part: 'picker' | 'fields' }>()
const emit = defineEmits<{ change: [] }>()

const preset = computed(() => presetOf(props.q.screen))
const on = computed(() => usesScreen(props.a, props.q))
const answers = computed<Cfg[]>(() => props.q.answers || [])

/** Every layout drawn as a sample, with as many empty answers as it has. */
const samples = SCREEN_PRESETS.map((p) => ({ p, s: { screen: p.id, answers: answersFor(p) } }))

function choose(id: string) {
  const p = presetOf(id)
  props.q.screen = p ? p.id : ''
  if (p) {
    props.q.answers = answersFor(p, props.q.answers || [])
    if (props.q.right != null && props.q.right >= props.q.answers.length) props.q.right = null
    if (!props.q.ask && props.q.name && !/^Question \d+$/.test(props.q.name)) props.q.ask = props.q.name
  }
  emit('change')
}

function set(key: string, value: unknown) {
  props.q[key] = value
  emit('change')
}
function setAnswer(k: number, key: string, value: string) {
  answers.value[k][key] = value
  emit('change')
}
function addAnswer() {
  if (answers.value.length < 4) answers.value.push({ text: '', scan: '', media: '' })
  emit('change')
}
function delAnswer(k: number) {
  if (answers.value.length > 2) {
    answers.value.splice(k, 1)
    if (props.q.right === k) props.q.right = null
    else if (props.q.right > k) props.q.right--
  }
  emit('change')
}

const pick = 'flex flex-col gap-[.3rem] rounded-[.6rem] border-2 bg-white p-[.35rem] text-left'
const pickName = 'text-[10.5px] font-bold leading-[1.2]'
</script>

<template>
  <!-- Which screen: the author's own media, or one of the ready-made layouts. -->
  <div v-if="part === 'picker'" class="mb-4 grid grid-cols-[repeat(auto-fill,minmax(86px,1fr))] gap-2">
    <button
      type="button"
      :class="[pick, !on ? 'border-brand-deep bg-brand-deep/[.06]' : 'border-border hover:border-brand-deep/40']"
      @click="choose('')"
    >
      <span class="flex aspect-video items-center justify-center rounded-[.45rem] bg-surface-2 text-brand-deep">
        <AIcon name="image" cls="h-5 w-5" />
      </span>
      <span :class="[pickName, !on ? 'text-brand-deep' : 'text-secondary-foreground']">Own picture, video or drawing</span>
    </button>
    <button
      v-for="x in samples"
      :key="x.p.id"
      type="button"
      :class="[pick, q.screen === x.p.id ? 'border-brand-deep bg-brand-deep/[.06]' : 'border-border hover:border-brand-deep/40']"
      @click="choose(x.p.id)"
    >
      <ScreenPreview :a="a" :s="x.s" sample />
      <span :class="[pickName, q.screen === x.p.id ? 'text-brand-deep' : 'text-secondary-foreground']">{{ x.p.name }}</span>
    </button>
  </div>

  <div v-else-if="preset" class="space-y-4">
    <div>
      <div class="mx-auto w-full max-w-[520px]"><ScreenPreview :a="a" :s="q" mark /></div>
      <p class="mt-1.5 text-center text-[11px] text-muted-foreground">Preview. The tick on the right answer shows only here, never to visitors.</p>
    </div>
    <AField label="The question">
      <input :value="q.ask || ''" placeholder="e.g. What did this amphora hold?" :class="inputCls" @input="set('ask', ($event.target as HTMLInputElement).value)" />
    </AField>
    <AField
      v-if="preset.media"
      :label="preset.media === 'VIDEO' ? 'The video' : 'The picture'"
      :help="preset.media === 'VIDEO' ? 'Plays above the answers.' : ''"
    >
      <MediaPicker :kind="preset.media === 'VIDEO' ? 'VIDEO' : 'PICTURE'" :model-value="q.screenMedia || ''" @update:model-value="set('screenMedia', $event)" />
    </AField>

    <div>
      <span class="mb-1.5 block text-[10px] font-bold uppercase tracking-overline text-muted-foreground">Answers — up to four. Tick the right one.</span>
      <div class="space-y-1.5">
        <div
          v-for="(ans, k) in answers"
          :key="k"
          class="flex flex-wrap items-center gap-2 rounded-sm border p-2"
          :class="q.right === k ? 'border-success bg-success/[.05]' : 'border-border bg-white'"
        >
          <button
            type="button"
            :title="q.right === k ? 'This is the right answer' : 'Make this the right answer'"
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded-pill border-2"
            :class="q.right === k ? 'border-success bg-success text-white' : 'border-input text-white hover:border-success hover:text-success'"
            @click="set('right', k)"
          >
            <AIcon name="check" cls="h-3.5 w-3.5" />
          </button>
          <input
            :value="ans.letter || ''"
            :placeholder="LETTERS[k]"
            maxlength="2"
            title="The letter shown on this answer"
            class="ans-letter h-8 w-10 shrink-0 rounded-pill border-0 text-center text-[13px] font-extrabold text-white outline-none"
            :style="{ background: answerHex(a, ans) }"
            @input="setAnswer(k, 'letter', ($event.target as HTMLInputElement).value)"
          />
          <input
            :value="ans.text || ''"
            :placeholder="'Answer ' + LETTERS[k]"
            :class="[inputCls, 'min-w-[10rem] flex-[1_1_12rem] py-1 text-[12.5px]']"
            @input="setAnswer(k, 'text', ($event.target as HTMLInputElement).value)"
          />
          <span v-if="preset.pictures" class="w-56">
            <MediaPicker kind="PICTURE" cls="py-1 text-[12.5px]" :model-value="ans.media || ''" @update:model-value="setAnswer(k, 'media', $event)" />
          </span>
          <span class="w-44">
            <TypeSelect
              :types="a.scanTypes"
              :model-value="ans.scan"
              :cls="'py-1 text-[12.5px]' + (ans.scan ? '' : ' border-warning')"
              @update:model-value="setAnswer(k, 'scan', $event)"
            />
          </span>
          <span class="flex items-center gap-1.5" title="The colour of this answer">
            <button
              type="button"
              title="Same colour as the object"
              class="flex h-7 items-center gap-1 rounded-pill border-2 px-2 text-[10.5px] font-bold"
              :class="ans.color ? 'border-border text-muted-foreground' : 'border-brand-deep text-brand-deep'"
              @click="setAnswer(k, 'color', '')"
            >
              <span class="h-3 w-3 rounded-pill" :style="{ background: ans.scan ? scanType(a, ans.scan).swatch : '#475569' }" />Object
            </button>
            <SwatchRow :model-value="ans.color || ''" @update:model-value="setAnswer(k, 'color', $event)" />
          </span>
          <button
            type="button"
            :disabled="answers.length <= 2"
            :title="answers.length <= 2 ? 'A question needs at least two answers' : 'Remove this answer'"
            class="ml-auto rounded-sm p-1 text-muted-foreground hover:bg-surface-2 hover:text-destructive disabled:opacity-25"
            @click="delAnswer(k)"
          >
            <AIcon name="x" cls="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <button
        v-if="answers.length < 4"
        type="button"
        class="mt-1.5 flex items-center gap-1.5 rounded-md border border-dashed border-input px-2.5 py-1.5 text-[11.5px] font-bold text-brand-deep hover:border-brand-deep hover:bg-white"
        @click="addAnswer"
      >
        <AIcon name="plus" cls="h-3 w-3" /> Add an answer
      </button>
      <p class="mt-2 text-[11.5px] text-muted-foreground">
        The visitor answers by placing that answer's object on the Box. Coloured cards work best: the colour on the screen matches the card in their hand.
      </p>
    </div>
  </div>
</template>
