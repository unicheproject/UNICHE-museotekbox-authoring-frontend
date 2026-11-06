<script setup lang="ts">
import { computed } from 'vue'
import { hasDisplay, mediaOf, template, type Authoring, type Cfg, type TemplateField } from '@/lib/authoring/engine'
import AIcon from './AIcon.vue'
import Choice from './ui/Choice.vue'
import MediaField from './ui/MediaField.vue'
import MoreSettings from './ui/MoreSettings.vue'
import MoveOnCard from './ui/MoveOnCard.vue'
import QCard from './ui/QCard.vue'
import ScanField from './ui/ScanField.vue'
import Seconds from './ui/Seconds.vue'
import Sub from './ui/Sub.vue'
import { addBtn, bigInput, btnOutline, rowRemove } from './ui/styles'

/**
 * The page of an activity other than the Quiz, one numbered card per question: what it opens with,
 * its rows in order (chapters, objects and their stories, clues), how it moves along, and when the
 * visitor moves on to the next step. The rare settings are folded under "More settings".
 */
const props = defineProps<{ a: Authoring; templateId: string; cfg: Cfg; stepKey: string }>()
const emit = defineEmits<{ change: []; advanced: [] }>()

const t = computed(() => template(props.templateId))
const display = computed(() => hasDisplay(props.a))
const field = (type: string) => t.value.fields.find((f) => f.type === type)
const list = computed(() => field('list'))
const opening = computed(() => field('opening'))
const closing = computed(() => field('closing'))
/** The Guided story moves from chapter to chapter by a card or on its own. */
const advance = computed(() => t.value.fields.find((f) => f.key === 'advance'))
const byCard = computed(() => props.cfg.advance === 'Scanning a card')
const hasFinish = computed(() => 'finish' in props.cfg)
const word = computed(() => list.value?.itemLabel ?? 'Item')

function set(key: string, value: unknown) {
  props.cfg[key] = value
  emit('change')
}
function setCell(key: string, i: number, col: string, value: string) {
  const row = props.cfg[key][i]
  row[col] = value
  // A chapter's "Shows" follows the file chosen for it.
  if (col === 'file' && 'media' in row) row.media = mediaOf(value)?.kind === 'VIDEO' ? 'Video' : 'Image'
  emit('change')
}
function addRow(f: TemplateField) {
  const row: Cfg = {}
  for (const c of f.columns || []) row[c.key] = c.type === 'select' ? c.options![0] : ''
  props.cfg[f.key].push(row)
  emit('change')
}
function delRow(key: string, i: number) {
  props.cfg[key].splice(i, 1)
  emit('change')
}
const rowMissing = (f: TemplateField, row: Cfg) => !row.file || ((f.columns || []).some((c) => c.type === 'scan') && !row.scan)
const hasScan = (f: TemplateField) => (f.columns || []).some((c) => c.type === 'scan')

/** The numbers of the cards, in the order they are shown. */
const numbers = computed(() => {
  let n = 0
  return {
    opening: opening.value && !opening.value.settings ? ++n : 0,
    scenes: props.templateId === 'scratch' ? ++n : 0,
    list: list.value ? ++n : 0,
    advance: advance.value ? ++n : 0,
    finish: hasFinish.value ? ++n : 0,
    next: ++n,
  }
})
</script>

<template>
  <QCard
    v-if="opening && numbers.opening"
    :n="numbers.opening"
    :title="opening.label"
    optional
  >
    <MediaField v-if="display" kind="VISUAL" :model-value="cfg.openingMedia" @update:model-value="set('openingMedia', $event)" />
    <MediaField v-else kind="AUDIO" :model-value="cfg.openingAudio" @update:model-value="set('openingAudio', $event)" />
  </QCard>

  <QCard v-if="numbers.scenes" :n="numbers.scenes" title="Its scenes">
    <button type="button" :class="btnOutline" @click="emit('advanced')">Open in Scenes and rules<AIcon name="arrow" /></button>
  </QCard>

  <QCard v-if="list" :n="numbers.list" :title="`The ${word.toLowerCase()}s, in order`" id="items">
    <div class="space-y-3">
      <div
        v-for="(row, r) in cfg[list.key]"
        :key="r"
        :id="`f-item-${r}`"
        class="rounded-md border p-3 sm:p-4"
        :class="rowMissing(list, row) ? 'border-amber-300' : 'border-border'"
      >
        <div class="mb-3 flex items-center gap-2 sm:gap-3">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[13.5px] font-extrabold">{{ r + 1 }}</span>
          <input
            :value="row.label ?? ''"
            :placeholder="`${word} title`"
            :class="[bigInput, '!py-2.5']"
            @input="setCell(list.key, r, 'label', ($event.target as HTMLInputElement).value)"
          />
          <button type="button" :class="rowRemove" @click="delRow(list.key, r)">Remove</button>
        </div>
        <div class="space-y-4">
          <div v-if="hasScan(list)">
            <Sub title="Its scan" />
            <ScanField :types="a.scanTypes" :model-value="row.scan" @update:model-value="setCell(list.key, r, 'scan', $event)" />
          </div>
          <MediaField
            :kind="display ? 'VISUAL' : 'AUDIO'"
            :model-value="row.file"
            @update:model-value="setCell(list.key, r, 'file', $event)"
          />
        </div>
      </div>
    </div>
    <button type="button" :class="[addBtn, 'mt-3']" @click="addRow(list)">
      <AIcon name="plus" cls="h-5 w-5" />Add a {{ word.toLowerCase() }}
    </button>
  </QCard>

  <QCard
    v-if="advance"
    :n="numbers.advance"
    title="How does the visitor go to the next chapter?"
    id="story-card"
    :miss="byCard && !cfg.card"
  >
    <div class="grid gap-3 sm:grid-cols-2">
      <Choice :on="byCard" icon="scan" label="By placing a scan" @pick="set('advance', advance.options![0])" />
      <Choice :on="!byCard" icon="timer" label="On its own" @pick="set('advance', advance.options![1])" />
    </div>
    <div class="mt-5">
      <ScanField v-if="byCard" :types="a.scanTypes" :model-value="cfg.card" @update:model-value="set('card', $event)" />
      <template v-else>
        <Sub title="Each chapter stays for" />
        <Seconds :model-value="cfg.seconds" @update:model-value="set('seconds', $event)" />
      </template>
    </div>
  </QCard>

  <QCard v-if="hasFinish" :n="numbers.finish" title="Which scan ends it?" id="finish" :miss="!cfg.finish">
    <p class="-mt-2 mb-4 text-[13.5px] text-muted-foreground">The visitor places it when they have seen enough.</p>
    <ScanField :types="a.scanTypes" :model-value="cfg.finish" @update:model-value="set('finish', $event)" />
  </QCard>

  <MoveOnCard :a="a" :from-key="stepKey" :n="numbers.next" @change="emit('change')" />

  <MoreSettings v-if="closing || (opening && opening.settings)">
    <div v-if="closing">
      <Sub :title="templateId === 'guided' ? 'A closing screen after the last chapter' : closing.label" optional />
      <MediaField v-if="display" kind="VISUAL" :model-value="cfg.closingMedia" @update:model-value="set('closingMedia', $event)" />
      <MediaField v-else kind="AUDIO" :model-value="cfg.closingAudio" @update:model-value="set('closingAudio', $event)" />
    </div>
  </MoreSettings>
</template>
