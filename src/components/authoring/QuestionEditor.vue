<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  INFO_MOVE,
  LETTERS,
  REPLY_KINDS,
  colorHex,
  hasDisplay,
  infoMoveOn,
  isInfo,
  newQuestion,
  or,
  questionGaps,
  scanName,
  usesScreen,
  type Authoring,
  type Cfg,
  type ReplyKind,
} from '@/lib/authoring/engine'
import { inputCls } from '@/lib/authoring/html'
import AField from './AField.vue'
import AIcon from './AIcon.vue'
import CustomRows from './CustomRows.vue'
import { ConfirmDialog } from '@/components/ui/dialog'
import ScreenFields from './ScreenFields.vue'
import MediaPicker from './MediaPicker.vue'
import SwatchRow from './SwatchRow.vue'
import TypeSelect from './TypeSelect.vue'

/**
 * The editor for one question or information, beside the quiz's list: what the visitor sees and
 * hears, then how it moves on (information) or which object answers it (a question).
 */
const props = defineProps<{ a: Authoring; cfg: Cfg; index: number }>()
const emit = defineEmits<{ change: []; moved: [index: number]; removed: [] }>()

const qs = computed<Cfg[]>(() => props.cfg.questions)
const q = computed(() => qs.value[props.index])
const info = computed(() => isInfo(q.value))
const number = computed(() => qs.value.slice(0, props.index + 1).filter((x) => !isInfo(x)).length)
const gaps = computed(() => questionGaps(props.a, q.value))

/** "Say something different on this question" stays open across edits once opened. */
const repliesOpen = ref(false)

function set(key: string, value: unknown) {
  q.value[key] = value
  emit('change')
}

function setReply(kind: ReplyKind, key: 'text' | 'color' | 'media' | 'audio', value: string) {
  if (!q.value.replies) q.value.replies = { correct: {}, hint: {}, wrong: {} }
  q.value.replies[kind] = { ...(q.value.replies[kind] || {}), [key]: value }
  emit('change')
}

function move(dir: number) {
  const i = props.index
  const j = i + dir
  if (j < 0 || j >= qs.value.length) return
  ;[qs.value[i], qs.value[j]] = [qs.value[j], qs.value[i]]
  emit('change')
  emit('moved', j)
}

/** Deleting a question or information asks first. */
const confirming = ref(false)
function remove() {
  confirming.value = false
  qs.value.splice(props.index, 1)
  if (!qs.value.length) qs.value.push(newQuestion(1))
  emit('change')
  emit('removed')
}

// Box-only has no screen, so there is no video to wait for.
const moveChoices = computed(() => Object.entries(INFO_MOVE).filter(([k]) => hasDisplay(props.a) || k !== 'video'))
const onScreen = computed(() => usesScreen(props.a, q.value))
const rightAnswer = computed<Cfg | null>(() =>
  onScreen.value && typeof q.value.right === 'number' ? (q.value.answers || [])[q.value.right] || null : null,
)
const hasVideo = computed(() => (q.value.display || []).some((c: Cfg) => c.type === 'VIDEO'))

/** What the screen shows, row by row: an image, a video or a drawing. */
const SHOW_KINDS = [
  { type: 'IMAGE', icon: 'image', label: 'Image' },
  { type: 'VIDEO', icon: 'film', label: 'Video' },
  { type: 'ILLUSTRATION', icon: 'brush', label: 'Drawing' },
] as const
const showKind = (type: string) => SHOW_KINDS.find((k) => k.type === type) ?? SHOW_KINDS[0]

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

const specific = computed(
  () => (q.value.customs || []).filter((c: Cfg) => c.scan).length + (props.a.details.customs || []).filter((c) => c.scan).length,
)
</script>

<template>
  <section class="min-w-0 rounded-md border border-border bg-white" :aria-label="info ? 'Information' : 'Question ' + number">
    <div class="flex items-center gap-2 border-b border-border px-4 py-3">
      <span
        class="shrink-0 rounded-sm px-2 py-1 text-[10px] font-extrabold uppercase tracking-overline text-brand-deep"
        :class="info ? 'bg-brand-purple/15' : 'bg-brand-deep/[.08]'"
      >
        {{ info ? 'Information' : 'Question ' + number }}
      </span>
      <input
        :value="q.name"
        :placeholder="`Give it a name, e.g. ${info ? 'How the temple was built' : 'Who made this vase?'}`"
        :class="[inputCls, 'min-w-0 flex-1 text-[14px] font-extrabold']"
        @input="set('name', ($event.target as HTMLInputElement).value)"
      />
      <span class="flex shrink-0 items-center text-muted-foreground">
        <button
          type="button"
          :disabled="index === 0"
          title="Earlier"
          class="rounded-sm p-1.5 hover:bg-surface-2 hover:text-brand-deep disabled:opacity-25"
          @click="move(-1)"
        >
          <AIcon name="arrow" cls="h-4 w-4 -rotate-90" />
        </button>
        <button
          type="button"
          :disabled="index === qs.length - 1"
          title="Later"
          class="rounded-sm p-1.5 hover:bg-surface-2 hover:text-brand-deep disabled:opacity-25"
          @click="move(1)"
        >
          <AIcon name="arrow" cls="h-4 w-4 rotate-90" />
        </button>
        <button type="button" title="Remove" class="rounded-sm p-1.5 hover:bg-surface-2 hover:text-destructive" @click="confirming = true">
          <AIcon name="trash" cls="h-4 w-4" />
        </button>
      </span>
    </div>

    <div class="space-y-5 p-4">
      <!-- What the visitor hears: Box-only has no screen, so the recording is the item. -->
      <div v-if="!hasDisplay(a)" class="rounded-md border border-border p-4">
        <div class="mb-3 text-[12.5px] font-extrabold">What the visitor hears</div>
        <AField
          label="Out of the Box"
          :help="
            info ? 'There is no screen, so this recording is the information.' : 'There is no screen, so this recording is the question.'
          "
        >
          <MediaPicker kind="AUDIO" :model-value="q.audio" @update:model-value="set('audio', $event)" />
        </AField>
      </div>

      <!-- What the visitor gets: the screen, then the Box. -->
      <div v-else class="rounded-md border border-border p-4">
        <div class="mb-3 text-[12.5px] font-extrabold">What the visitor gets</div>
        <ScreenFields v-if="!info" :a="a" :q="q" part="picker" @change="emit('change')" />
        <ScreenFields v-if="onScreen" :a="a" :q="q" part="fields" @change="emit('change')" />
        <div v-else class="space-y-1.5">
          <span class="block text-[10px] font-bold uppercase tracking-overline text-muted-foreground">On the screen</span>
          <div v-for="(c, k) in q.display || []" :key="k" class="flex items-center gap-2 rounded-sm border border-border bg-white p-1.5">
            <span
              class="flex w-24 shrink-0 items-center justify-center gap-1 rounded-sm bg-surface-2 py-1 text-[10px] font-bold uppercase tracking-overline text-brand-deep"
            >
              <AIcon :name="showKind(c.type).icon" cls="h-3 w-3" />{{ showKind(c.type).label }}
            </span>
            <span class="min-w-0 flex-1">
              <MediaPicker :kind="c.type" cls="py-1 text-[12.5px]" :model-value="c.name" @update:model-value="setShown(k, $event)" />
            </span>
            <button
              type="button"
              class="rounded-sm p-1 text-muted-foreground hover:bg-surface-2 hover:text-destructive"
              @click="delShown(k)"
            >
              <AIcon name="x" cls="h-3.5 w-3.5" />
            </button>
          </div>
          <p
            v-if="!(q.display || []).length"
            class="rounded-sm border border-dashed border-warning/50 bg-warning/[.05] px-3 py-2 text-[12px] text-warning"
          >
            {{
              info
                ? 'Nothing to show yet — add a video, a picture or a drawing.'
                : 'Nothing to show yet — a question is never plain text, it is a picture, a video or a drawing.'
            }}
          </p>
          <div class="flex flex-wrap gap-2 pt-1">
            <button
              v-for="t in SHOW_KINDS"
              :key="t.type"
              type="button"
              class="flex items-center gap-1.5 rounded-md border border-dashed border-input px-2.5 py-1.5 text-[11.5px] font-bold text-brand-deep hover:border-brand-deep hover:bg-white"
              @click="addShown(t.type)"
            >
              <AIcon :name="t.icon" cls="h-3 w-3" /> {{ t.label }}
            </button>
          </div>
        </div>
        <div class="mt-4 border-t border-border pt-3">
          <AField
            label="Out of the Box (optional)"
            :help="
              info
                ? 'Sound that plays with it. Leave empty for a silent Box.'
                : 'Sound that plays with the question. Leave empty for a silent Box.'
            "
          >
            <MediaPicker kind="AUDIO" :model-value="q.audio" @update:model-value="set('audio', $event)" />
          </AField>
        </div>
      </div>

      <!-- Information: when it moves on to the next question. -->
      <div v-if="info" class="rounded-md border border-border p-4">
        <div class="mb-3 text-[12.5px] font-extrabold">When it moves on to the next question</div>
        <div class="flex flex-wrap items-center gap-2">
          <select
            :value="infoMoveOn(a, q)"
            :class="[inputCls, 'max-w-sm']"
            @change="set('moveOn', ($event.target as HTMLSelectElement).value)"
          >
            <option v-for="[k, l] in moveChoices" :key="k" :value="k">
              {{ l }}
            </option>
          </select>
          <template v-if="infoMoveOn(a, q) === 'time'">
            <input
              type="number"
              min="1"
              :value="q.seconds ?? ''"
              placeholder="10"
              :class="[inputCls, 'max-w-[6rem]']"
              @input="set('seconds', ($event.target as HTMLInputElement).value)"
            />
            <span class="text-[13px] text-muted-foreground">seconds</span>
          </template>
        </div>
        <p v-if="infoMoveOn(a, q) === 'video' && !hasVideo" class="mt-2 text-[12px] font-bold text-warning">
          There is no video above to wait for — add one, or choose another way to move on.
        </p>
        <p v-if="infoMoveOn(a, q) === 'scan'" class="mt-2 text-[12px] text-muted-foreground">
          Nothing is scored here: whatever is placed simply moves the visitor on.
        </p>
      </div>

      <!-- A question: which object answers it, and what it says when it is not the usual reply. -->
      <template v-else>
        <div class="rounded-md border border-border p-4">
          <div class="mb-3 text-[12.5px] font-extrabold">Which object answers it</div>
          <div class="grid gap-4 sm:grid-cols-2">
            <!-- On a ready-made screen the right answer is the ticked one, said in words. -->
            <div v-if="onScreen">
              <span class="mb-1.5 block text-[10px] font-bold uppercase tracking-overline text-muted-foreground">The right answer</span>
              <p
                class="rounded-sm px-3 py-2 text-[12.5px] font-bold"
                :class="rightAnswer ? 'bg-success/[.08] text-success' : 'bg-warning/[.07] text-warning'"
              >
                <template v-if="rightAnswer">
                  {{ LETTERS[q.right] }} · “{{ or(rightAnswer.text, 'Answer ' + LETTERS[q.right]) }}”<template v-if="rightAnswer.scan">
                    — placing the {{ scanName(a, rightAnswer.scan) }}</template
                  >
                </template>
                <template v-else>Tick the right answer above</template>
              </p>
              <span class="mt-1 block text-[11.5px] text-muted-foreground">Placing it moves the visitor on to the next item.</span>
            </div>
            <AField v-else label="The right object" help="Placing this moves the visitor on to the next question.">
              <TypeSelect
                :types="a.scanTypes"
                :model-value="q.correct"
                :cls="q.correct ? '' : 'border-warning'"
                @update:model-value="set('correct', $event)"
              />
            </AField>
            <AField label="Clue object (optional)" help="Gives the clue and leaves the question up.">
              <TypeSelect :types="a.scanTypes" :model-value="q.hint" @update:model-value="set('hint', $event)" />
            </AField>
          </div>
          <p class="mt-3 rounded-sm bg-surface-2 px-3 py-2 text-[12px] text-secondary-foreground">
            {{ onScreen ? 'The other answers, and every other object, get' : 'Every other object gets' }}
            the “anything else” reply<template v-if="specific"
              >, except the {{ specific }} wrong answer{{ specific === 1 ? '' : 's' }} that {{ specific === 1 ? 'has' : 'have' }} a reply of
              {{ specific === 1 ? 'its' : 'their' }} own</template
            >.
          </p>
        </div>

        <details
          class="rounded-md border border-border"
          :open="repliesOpen"
          @toggle="repliesOpen = ($event.target as HTMLDetailsElement).open"
        >
          <summary
            class="cursor-pointer list-none px-4 py-3 text-[12.5px] font-extrabold text-brand-deep [&::-webkit-details-marker]:hidden"
          >
            Say something different on this question
          </summary>
          <div class="space-y-4 border-t border-border px-4 py-4">
            <div v-for="k in REPLY_KINDS" :key="k.key">
              <div class="mb-1.5 flex items-center gap-2 text-[12px] font-bold">
                <span
                  class="h-2.5 w-2.5 rounded-pill"
                  :style="{
                    background: colorHex(q.replies?.[k.key]?.color || a.details.replies[k.key].color),
                  }"
                />{{ k.label }}
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <input
                  :value="q.replies?.[k.key]?.text || ''"
                  :placeholder="a.details.replies[k.key].text"
                  :class="[inputCls, 'min-w-[10rem] flex-[1_1_12rem] py-1.5 text-[12.5px]']"
                  @input="setReply(k.key, 'text', ($event.target as HTMLInputElement).value)"
                />
                <span class="w-56">
                  <MediaPicker
                    :kind="hasDisplay(a) ? 'PICTURE' : 'AUDIO'"
                    cls="py-1.5 text-[12.5px]"
                    :model-value="q.replies?.[k.key]?.[hasDisplay(a) ? 'media' : 'audio'] || ''"
                    @update:model-value="setReply(k.key, hasDisplay(a) ? 'media' : 'audio', $event)"
                  />
                </span>
                <SwatchRow
                  v-if="hasDisplay(a)"
                  :model-value="q.replies?.[k.key]?.color || a.details.replies[k.key].color"
                  @update:model-value="setReply(k.key, 'color', $event)"
                />
              </div>
            </div>
            <CustomRows :a="a" :rows="q.customs" one @change="emit('change')" />
          </div>
        </details>
      </template>
    </div>

    <div class="border-t border-border px-4 py-3">
      <span class="text-[12px] font-bold" :class="gaps.length ? 'text-warning' : 'text-success'">
        {{ gaps.length ? gaps.join(' · ') : 'All set' }}
      </span>
    </div>
    <ConfirmDialog
      v-model:open="confirming"
      :title="info ? 'Delete this information?' : 'Delete this question?'"
      description="Everything set up in it goes with it."
      confirm-label="Delete"
      @confirm="remove"
    />
  </section>
</template>
