<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  OPS,
  SCENE_COLOR,
  conditionText,
  colorHex,
  editRules,
  effectText,
  hasDisplay,
  mediaName,
  or,
  presetOf,
  reachedFrom,
  sceneGaps,
  scanName,
  scanType,
  template,
  usedScanTypes,
  type Authoring,
  type Block,
  type Condition,
  type Destination,
  type Effect,
  type Rule,
  type Trigger,
} from '@/lib/authoring/engine'
import { btnOutline, btnPrimary, inputCls } from '@/lib/authoring/html'
import AIcon from './AIcon.vue'
import MediaPicker from './MediaPicker.vue'
import MediaThumb from './MediaThumb.vue'
import ScreenPreview from './ScreenPreview.vue'
import SwatchRow from './SwatchRow.vue'
import TypeSelect from './TypeSelect.vue'
import { ConfirmDialog } from '@/components/ui/dialog'

/**
 * Scenes and rules: what the steps of the visit turn into, scene by scene, for the
 * fixes the forms cannot make. A change here stands until the activity's own form changes that
 * scene again.
 */
const props = defineProps<{ a: Authoring }>()
const emit = defineEmits<{ change: []; back: []; activity: [key: string] }>()

const scenes = computed(() => props.a.built.scenes)
const selected = ref(0)
const scene = computed(() => scenes.value[selected.value] || scenes.value[0])
const inbound = computed(() => (scene.value ? reachedFrom(props.a, scene.value.id) : []))
const island = computed(() => props.a.islands.find((x) => x.key === scene.value?.island))

/** Where each step's scenes begin in the list, for its heading. */
const heads = computed(() => scenes.value.map((sc, i) => i === 0 || scenes.value[i - 1].island !== sc.island))
function stepTitle(islandKey: string | undefined) {
  const isl = props.a.islands.find((x) => x.key === islandKey)
  if (isl) return { icon: template(isl.templateId).icon, name: template(isl.templateId).name }
  return islandKey === '@start' ? { icon: 'bolt', name: 'Start' } : { icon: 'flag', name: 'End' }
}

// ─── the vocabulary of a rule, in plain words

const TRIGGER_LABELS: Record<Trigger['type'], string> = {
  SCAN: 'an object is placed on the Box',
  SCAN_OTHER: 'any other object is placed',
  TIMER_ELAPSED: 'time passes here',
  VIDEO_ENDED: 'the video finishes',
  SCENE_ENTERED: 'the visitor arrives here',
  SESSION_STARTED: 'the visit starts',
}
const DEST_LABELS: Record<Destination['type'], string> = { GO_TO: 'go to a scene', STAY: 'stay here', END: 'end the visit' }
const EFFECT_LABELS: Record<Effect['type'], string> = {
  REPLY: 'answer the visitor',
  ADD_NUMBER: 'add to a number',
  SET_NUMBER: 'set a number',
  SET_FLAG: 'turn a flag on or off',
  BOX_SCREEN: 'show text on the Box',
  BOX_AUDIO: 'play a sound',
}
const COND_LABELS: Record<Condition['type'], string> = { VAR_CMP: 'a number compares', FLAG_IS: 'a flag is on or off' }

const vars = (kind: 'NUMBER' | 'FLAG') => props.a.built.variables.filter((v) => v.kind === kind).map((v) => v.key)

// ─── changing the rules of the scene on screen

function change(fn: (rules: Rule[]) => void) {
  if (!scene.value) return
  editRules(props.a, scene.value.id, fn)
  emit('change')
}

const newTrigger = (type: Trigger['type']): Trigger =>
  type === 'SCAN' ? { type, cardTypeId: null } : type === 'TIMER_ELAPSED' ? { type, seconds: 10 } : ({ type } as Trigger)
const newDestination = (type: Destination['type']): Destination => (type === 'GO_TO' ? { type, targetSceneKey: null } : { type })

/** "The visit starts" happens only on the start scene. */
const triggerChoices = computed(() =>
  (Object.entries(TRIGGER_LABELS) as [Trigger['type'], string][]).filter(([k]) => k !== 'SESSION_STARTED' || scene.value?.start),
)

/** A new rule waits for an object, so it goes in before the scene's catch-all ("anything else"). */
function addRule() {
  change((rules) => {
    const at = rules.findIndex((r) => r.trigger.type === 'SCAN_OTHER')
    rules.splice(at < 0 ? rules.length : at, 0, {
      key: 'h' + Date.now().toString(36),
      label: '',
      trigger: newTrigger('SCAN'),
      condition: null,
      effects: [],
      destination: newDestination('STAY'),
      chain: false,
    })
  })
}

/** Removing a rule asks first. */
const removing = ref<number | null>(null)
function removeRule() {
  const i = removing.value
  if (i != null) change((rules) => rules.splice(i, 1))
  removing.value = null
}
function move(i: number, dir: number) {
  change((rules) => {
    const j = i + dir
    if (j >= 0 && j < rules.length) [rules[i], rules[j]] = [rules[j], rules[i]]
  })
}

// ─── adding an effect or a condition, in a small panel under the rule

type Draft = { rule: string; what: 'effect'; d: Effect } | { rule: string; what: 'condition'; d: Condition }
const draft = ref<Draft | null>(null)
watch(selected, () => (draft.value = null))

function effectDraft(type: Effect['type']): Effect {
  const first = vars('NUMBER')[0] || ''
  if (type === 'SET_NUMBER') return { type, var: first, value: 0 }
  if (type === 'ADD_NUMBER') return { type, var: first, amount: 1 }
  if (type === 'SET_FLAG') return { type, var: vars('FLAG')[0] || '', value: true }
  if (type === 'BOX_SCREEN') return { type, text: '' }
  if (type === 'BOX_AUDIO') return { type, url: '' }
  return { type: 'REPLY', color: 'grey', text: '', media: '', audio: '', boxVideo: '' }
}
function conditionDraft(type: Condition['type']): Condition {
  return type === 'VAR_CMP' ? { type, var: vars('NUMBER')[0] || '', op: 'GTE', value: 1 } : { type, var: vars('FLAG')[0] || '', value: true }
}
/** Only what can be used here: number effects need a number the experience keeps, flags a flag. */
const effectChoices = computed(() =>
  (Object.entries(EFFECT_LABELS) as [Effect['type'], string][]).filter(([k]) =>
    k === 'SET_NUMBER' || k === 'ADD_NUMBER' ? vars('NUMBER').length : k === 'SET_FLAG' ? vars('FLAG').length : true,
  ),
)
const conditionChoices = computed(() =>
  (Object.entries(COND_LABELS) as [Condition['type'], string][]).filter(([k]) => vars(k === 'VAR_CMP' ? 'NUMBER' : 'FLAG').length),
)
/** The draft can be saved once it says something the Box can do. */
const draftReady = computed(() => {
  const d = draft.value?.d
  if (!d) return false
  if ('var' in d && !d.var) return false
  if (d.type === 'BOX_SCREEN') return !!d.text.trim()
  return true
})

function saveDraft(i: number) {
  const dr = draft.value
  if (!dr || !draftReady.value) return
  // Numbers go to the Box as whole numbers.
  if (dr.d.type === 'SET_NUMBER' || dr.d.type === 'VAR_CMP') dr.d.value = Math.round(Number(dr.d.value) || 0)
  if (dr.d.type === 'ADD_NUMBER') dr.d.amount = Math.round(Number(dr.d.amount) || 0)
  change((rules) => {
    if (dr.what === 'effect') rules[i].effects.push(dr.d)
    else rules[i].condition = dr.d
  })
  draft.value = null
}

const blockIcon = (b: Block) =>
  b.type === 'SCREEN' ? 'grid' : b.type === 'VIDEO' || b.type === 'BOX_VIDEO' ? 'film' : b.type === 'IMAGE' ? 'image' : b.type === 'ILLUSTRATION' ? 'brush' : b.type === 'AUDIO' ? 'audio' : 'chat'
const blockKind = (b: Block) => (b.type === 'ILLUSTRATION' ? 'Drawing' : b.type === 'BOX_VIDEO' ? 'video on the Box' : b.type.toLowerCase())
const blockLabel = (b: Block) =>
  b.type === 'SCREEN'
    ? `${presetOf(b.content.screen)?.name || 'Screen template'} · “${b.content.ask || 'no question words yet'}”`
    : mediaName(b.content.text || b.content.url || '')
const thumbKind = (b: Block) => (b.type === 'BOX_VIDEO' || b.type === 'VIDEO' ? 'VIDEO' : b.type === 'AUDIO' ? 'AUDIO' : 'IMAGE')

/** What is still missing anywhere in the visit. */
const readiness = computed(() => scenes.value.flatMap((sc) => sceneGaps(props.a, sc).map((text) => ({ text, where: sc.name }))))

const sel = 'rounded-md border border-input bg-white px-2 py-1.5 text-[12.5px] font-bold text-brand-deep outline-none hover:border-brand-deep'
const selEmpty = 'rounded-md border border-dashed border-warning bg-white px-2 py-1.5 text-[12.5px] font-bold text-warning outline-none'
const card = 'rounded-lg border border-border bg-white p-5 shadow-xs'
const overline = 'text-[10px] font-extrabold uppercase tracking-overline text-muted-foreground'
const val = (e: Event) => (e.target as HTMLInputElement).value
</script>

<template>
  <div class="mb-5">
    <button type="button" class="mb-1 flex items-center gap-1.5 text-[13px] font-bold text-muted-foreground hover:text-brand-deep" @click="emit('back')">
      ← {{ or(a.details.name, 'Untitled experience') }}
    </button>
    <h1 class="text-2xl font-extrabold tracking-tight">Scenes and rules</h1>
    <p class="mt-1 max-w-2xl text-[12.5px] text-muted-foreground">
      What the steps of the visit turn into. For fixes the forms cannot make — and changes here are replaced if the activity’s own form is
      edited again.
    </p>
  </div>

  <div class="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
    <!-- Every scene, under the step it belongs to. -->
    <div class="lg:sticky lg:top-6 lg:self-start">
      <div class="rounded-lg border border-border bg-white shadow-xs">
        <div class="flex items-center justify-between border-b border-border px-4 py-3">
          <span class="text-[14px] font-extrabold">Scenes</span>
          <span :class="overline">{{ scenes.length }}</span>
        </div>
        <div class="p-2">
          <template v-for="(sc, i) in scenes" :key="sc.id">
            <div v-if="heads[i]" :class="[overline, 'mt-2 flex items-center gap-1.5 px-2.5 pb-1 pt-1']">
              <AIcon :name="stepTitle(sc.island).icon" cls="h-3 w-3" />{{ stepTitle(sc.island).name }}
            </div>
            <button
              type="button"
              class="flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left transition-colors"
              :class="i === selected ? 'bg-brand-deep/[.08]' : 'hover:bg-surface-2'"
              @click="selected = i"
            >
              <span class="rounded-sm bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{{ sc.key }}</span>
              <span class="min-w-0 flex-1">
                <span class="flex items-center gap-1.5">
                  <span class="h-2.5 w-2.5 shrink-0 rounded-pill" :style="{ background: SCENE_COLOR[sc.kind] || '#9ca3af' }" />
                  <span class="truncate text-[13px] font-bold" :class="i === selected ? 'text-brand-deep' : ''">{{ sc.name }}</span>
                </span>
                <span class="mt-0.5 block text-[11px] text-muted-foreground">
                  {{ sc.rules.length }} rule{{ sc.rules.length === 1 ? '' : 's' }}<template v-if="sc.role && sc.island?.[0] !== '@'">
                    · {{ sc.role }} of this activity</template
                  ><template v-if="a.edits?.[sc.id]"> · changed here</template>
                </span>
              </span>
              <span v-if="sc.start" class="shrink-0 text-brand-deep" title="The visit begins here"><AIcon name="bolt" cls="h-3.5 w-3.5" /></span>
              <span v-if="sceneGaps(a, sc).length" class="h-2 w-2 shrink-0 rounded-pill bg-warning" :title="`${sceneGaps(a, sc).length} to fix`" />
            </button>
          </template>
        </div>
      </div>
    </div>

    <div v-if="scene" class="space-y-4">
      <!-- The scene: its name, and how the visitor gets here. -->
      <div :class="card">
        <div class="flex flex-wrap items-center gap-3">
          <span class="text-[18px] font-extrabold">{{ scene.name }}</span>
          <span class="font-mono text-[11px] text-muted-foreground">{{ scene.key }}</span>
          <span
            v-if="scene.start"
            class="rounded-pill bg-brand-deep px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-overline text-white"
          >
            The visit begins here
          </span>
          <button
            v-if="island"
            type="button"
            class="ml-auto text-[12px] font-bold text-brand-deep hover:underline"
            @click="emit('activity', island.key)"
          >
            Edit the {{ template(island.templateId).name }} activity
          </button>
        </div>
        <div
          class="mt-4 rounded-md border-l-2 px-3.5 py-3"
          :class="inbound.length || scene.start ? 'border-brand-deep bg-brand-deep/[.05]' : 'border-warning bg-warning/[.07]'"
        >
          <template v-if="scene.start">
            <div class="text-[12.5px] font-bold text-brand-deep">The visit begins here</div>
            <p class="mt-1 text-[12.5px] text-secondary-foreground">
              The Box sits idle and open.
              <template v-if="scene.initCard">Placing <b>{{ scanName(a, scene.initCard) }}</b> on it begins the visit.</template>
              <b v-else class="text-warning">No object starts it yet.</b>
            </p>
          </template>
          <template v-else-if="inbound.length">
            <div class="text-[12.5px] font-bold text-brand-deep">The visitor gets here from</div>
            <ul class="mt-1.5 space-y-1">
              <li v-for="(x, k) in inbound" :key="k" class="text-[12.5px] text-secondary-foreground">
                <b>{{ x.scene.name }}</b> <span class="text-muted-foreground">·</span> {{ x.rule.label }}
              </li>
            </ul>
          </template>
          <div v-else class="text-[12.5px] font-bold text-warning">Nothing leads here</div>
        </div>
      </div>

      <!-- What it shows and plays. -->
      <div :class="card">
        <div :class="[overline, 'pb-3']">{{ hasDisplay(a) ? 'On the screen and out of the Box' : 'Out of the Box' }}</div>
        <div class="space-y-2">
          <div v-for="(b, k) in scene.blocks" :key="k" class="flex items-center gap-2.5 rounded-md border border-border p-2.5">
            <span v-if="b.type === 'SCREEN'" class="block w-[78px] shrink-0"><ScreenPreview :a="a" :s="b.content" /></span>
            <MediaThumb v-else :value="b.content.url" :kind="thumbKind(b)" />
            <span class="flex items-center gap-1.5 rounded-sm bg-surface-2 px-2 py-1 text-[10px] font-bold uppercase tracking-overline text-brand-deep">
              <AIcon :name="blockIcon(b)" cls="h-3 w-3" />{{ blockKind(b) }}
            </span>
            <span class="min-w-0 flex-1 truncate text-[12.5px] font-semibold">{{ blockLabel(b) }}</span>
          </div>
          <p v-if="!scene.blocks.length" class="rounded-md border border-dashed border-input p-4 text-center text-[12px] text-muted-foreground">
            Nothing here yet.
          </p>
        </div>
      </div>

      <!-- What can happen here: the rules, first match wins. -->
      <div :class="card">
        <div class="flex items-center justify-between pb-3">
          <span :class="overline">What can happen here</span>
          <span class="font-mono text-[10.5px] text-muted-foreground">first match wins, top to bottom</span>
        </div>
        <div v-if="scene.rules.length" class="space-y-2">
          <div
            v-for="(r, i) in scene.rules"
            :key="r.key + i"
            class="rounded-md border p-3"
            :class="r.trigger.type === 'SCAN' && !r.trigger.cardTypeId ? 'border-warning/40 bg-warning/[.05]' : 'border-border bg-surface-2/50'"
          >
            <div class="mb-2 flex items-center justify-between gap-2">
              <span class="flex min-w-0 flex-1 items-center gap-2">
                <span class="rounded-sm bg-white px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">r{{ i + 1 }}</span>
                <input
                  :value="r.label"
                  placeholder="Name this"
                  class="min-w-0 flex-1 rounded-sm border border-transparent bg-transparent px-1 py-0.5 text-[12.5px] font-bold hover:border-input focus:border-input focus:bg-white focus:outline-none"
                  @change="change((rules) => (rules[i].label = val($event)))"
                />
              </span>
              <span class="flex shrink-0 items-center gap-1 text-muted-foreground">
                <button type="button" :disabled="i === 0" title="Earlier" class="rounded-sm p-1 hover:bg-white hover:text-brand-deep disabled:opacity-30" @click="move(i, -1)">
                  <AIcon name="arrow" cls="h-3.5 w-3.5 -rotate-90" />
                </button>
                <button
                  type="button"
                  :disabled="i === scene.rules.length - 1"
                  title="Later"
                  class="rounded-sm p-1 hover:bg-white hover:text-brand-deep disabled:opacity-30"
                  @click="move(i, 1)"
                >
                  <AIcon name="arrow" cls="h-3.5 w-3.5 rotate-90" />
                </button>
                <button type="button" title="Delete" class="rounded-sm p-1 hover:bg-white hover:text-destructive" @click="removing = i">
                  <AIcon name="trash" cls="h-3.5 w-3.5" />
                </button>
              </span>
            </div>

            <div class="flex flex-wrap items-center gap-2 text-[12.5px] text-secondary-foreground">
              <span class="font-bold text-muted-foreground">When</span>
              <select :value="r.trigger.type" :class="sel" @change="change((rules) => (rules[i].trigger = newTrigger(val($event) as Trigger['type'])))">
                <option v-for="[k, l] in triggerChoices" :key="k" :value="k">{{ l }}</option>
              </select>
              <span v-if="r.trigger.type === 'SCAN'" class="w-auto max-w-[13rem]">
                <TypeSelect
                  :types="a.scanTypes"
                  :model-value="r.trigger.cardTypeId ?? ''"
                  :cls="'py-1.5 text-[12.5px] font-bold' + (r.trigger.cardTypeId ? '' : ' border-dashed border-warning')"
                  @update:model-value="(v) => change((rules) => (rules[i].trigger = { type: 'SCAN', cardTypeId: v || null }))"
                />
              </span>
              <template v-if="r.trigger.type === 'TIMER_ELAPSED'">
                <input
                  type="number"
                  min="1"
                  :value="r.trigger.seconds || ''"
                  placeholder="10"
                  class="w-20 rounded-md border bg-white px-2 py-1.5 text-[12.5px] font-bold outline-none"
                  :class="r.trigger.seconds ? 'border-input' : 'border-dashed border-warning'"
                  @change="change((rules) => (rules[i].trigger = { type: 'TIMER_ELAPSED', seconds: Math.max(1, Math.round(Number(val($event)) || 10)) }))"
                /><span>seconds</span>
              </template>
              <span class="text-muted-foreground">,</span>
              <select
                :value="r.destination.type"
                :class="sel"
                @change="change((rules) => (rules[i].destination = newDestination(val($event) as Destination['type'])))"
              >
                <option v-for="(l, k) in DEST_LABELS" :key="k" :value="k">{{ l }}</option>
              </select>
              <select
                v-if="r.destination.type === 'GO_TO'"
                :value="r.destination.targetSceneKey ?? ''"
                :class="r.destination.targetSceneKey ? sel : selEmpty"
                @change="change((rules) => (rules[i].destination = { type: 'GO_TO', targetSceneKey: val($event) || null }))"
              >
                <option value="">choose a scene…</option>
                <option v-for="sc in scenes" :key="sc.id" :value="sc.id">{{ sc.name }}</option>
              </select>
            </div>

            <div v-if="r.condition || r.effects.length" class="mt-2.5 flex flex-wrap gap-1.5">
              <span
                v-if="r.condition"
                class="inline-flex items-center gap-1.5 rounded-pill border border-warning/30 bg-warning/10 px-2.5 py-1 text-[11.5px] text-warning"
              >
                <b>Only if</b> <span v-html="conditionText(r.condition)" />
                <button type="button" class="hover:text-destructive" @click="change((rules) => (rules[i].condition = null))">
                  <AIcon name="x" cls="h-3 w-3" />
                </button>
              </span>
              <span
                v-for="(e, k) in r.effects"
                :key="k"
                class="inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-[11.5px]"
                :class="e.type === 'REPLY' ? 'border-border' : 'border-success/30 bg-success/10 text-success'"
                :style="e.type === 'REPLY' ? { background: colorHex(e.color) + '18', color: colorHex(e.color) } : {}"
              >
                <span v-html="effectText(a, e)" />
                <button type="button" class="hover:text-destructive" @click="change((rules) => rules[i].effects.splice(k, 1))">
                  <AIcon name="x" cls="h-3 w-3" />
                </button>
              </span>
            </div>

            <div class="mt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                class="text-[12px] font-bold text-brand-deep hover:underline"
                @click="draft = { rule: r.key + i, what: 'effect', d: effectDraft('REPLY') }"
              >
                + something it does
              </button>
              <button
                v-if="!r.condition && conditionChoices.length"
                type="button"
                class="text-[12px] font-bold text-brand-deep hover:underline"
                @click="draft = { rule: r.key + i, what: 'condition', d: conditionDraft('VAR_CMP') }"
              >
                + only if
              </button>
            </div>

            <!-- The effect or condition being added. -->
            <div v-if="draft && draft.rule === r.key + i" class="mt-3 rounded-md border border-border bg-white p-3">
              <template v-if="draft.what === 'effect'">
                <div class="mt-2 flex flex-wrap items-center gap-2 text-[12.5px]">
                  <span class="font-bold text-muted-foreground">It</span>
                  <select :value="draft.d.type" :class="sel" @change="draft.d = effectDraft(val($event) as Effect['type'])">
                    <option v-for="[k, l] in effectChoices" :key="k" :value="k">{{ l }}</option>
                  </select>
                </div>
                <div v-if="draft.d.type === 'REPLY'" class="mt-2 flex flex-wrap items-center gap-2 text-[12.5px]">
                  <input v-model="draft.d.text" placeholder="What it says" :class="[inputCls, 'max-w-xs py-1.5 text-[12.5px]']" />
                  <SwatchRow v-model="draft.d.color" />
                </div>
                <div v-if="draft.d.type === 'SET_NUMBER' || draft.d.type === 'ADD_NUMBER'" class="mt-2 flex flex-wrap items-center gap-2 text-[12.5px]">
                  <select v-model="draft.d.var" :class="sel"><option v-for="v in vars('NUMBER')" :key="v" :value="v">{{ v }}</option></select>
                  <span>{{ draft.d.type === 'ADD_NUMBER' ? 'by' : 'to' }}</span>
                  <input v-if="draft.d.type === 'ADD_NUMBER'" v-model.number="draft.d.amount" type="number" class="w-24 rounded-md border border-input bg-white px-2 py-1.5 text-[12.5px]" />
                  <input v-else v-model.number="draft.d.value" type="number" class="w-24 rounded-md border border-input bg-white px-2 py-1.5 text-[12.5px]" />
                </div>
                <div v-if="draft.d.type === 'SET_FLAG'" class="mt-2 flex flex-wrap items-center gap-2 text-[12.5px]">
                  <select v-model="draft.d.var" :class="sel"><option v-for="v in vars('FLAG')" :key="v" :value="v">{{ v }}</option></select>
                  <select v-model="draft.d.value" :class="sel"><option :value="true">on</option><option :value="false">off</option></select>
                </div>
                <div v-if="draft.d.type === 'BOX_SCREEN'" class="mt-2 flex flex-wrap items-center gap-2 text-[12.5px]">
                  <input v-model="draft.d.text" placeholder="What the Box screen says" :class="[inputCls, 'max-w-sm py-1.5 text-[12.5px]']" />
                </div>
                <div v-if="draft.d.type === 'BOX_AUDIO'" class="mt-2 max-w-sm">
                  <MediaPicker kind="AUDIO" cls="py-1.5 text-[12.5px]" :model-value="draft.d.url" @update:model-value="(v) => draft?.d.type === 'BOX_AUDIO' && (draft.d.url = v)" />
                </div>
              </template>
              <template v-else>
                <div class="mt-2 flex flex-wrap items-center gap-2 text-[12.5px]">
                  <span class="font-bold text-muted-foreground">Only run this if</span>
                  <select :value="draft.d.type" :class="sel" @change="draft.d = conditionDraft(val($event) as Condition['type'])">
                    <option v-for="[k, l] in conditionChoices" :key="k" :value="k">{{ l }}</option>
                  </select>
                </div>
                <div v-if="draft.d.type === 'VAR_CMP'" class="mt-2 flex flex-wrap items-center gap-2 text-[12.5px]">
                  <select v-model="draft.d.var" :class="sel"><option v-for="v in vars('NUMBER')" :key="v" :value="v">{{ v }}</option></select>
                  <select v-model="draft.d.op" :class="sel"><option v-for="(l, k) in OPS" :key="k" :value="k">{{ l }}</option></select>
                  <input v-model.number="draft.d.value" type="number" class="w-24 rounded-md border border-input bg-white px-2 py-1.5 text-[12.5px]" />
                </div>
                <div v-if="draft.d.type === 'FLAG_IS'" class="mt-2 flex flex-wrap items-center gap-2 text-[12.5px]">
                  <select v-model="draft.d.var" :class="sel"><option v-for="v in vars('FLAG')" :key="v" :value="v">{{ v }}</option></select>
                  <span>is</span>
                  <select v-model="draft.d.value" :class="sel"><option :value="true">on</option><option :value="false">off</option></select>
                </div>
              </template>
              <div class="mt-3 flex gap-2">
                <button type="button" :class="[btnPrimary, 'disabled:opacity-40']" :disabled="!draftReady" @click="saveDraft(i)">Save</button>
                <button type="button" :class="btnOutline" @click="draft = null">Cancel</button>
              </div>
            </div>
          </div>
        </div>
        <p v-else class="rounded-md border border-dashed border-input p-4 text-center text-[12px] text-muted-foreground">
          Nothing can happen on this scene.
        </p>
        <button
          type="button"
          class="mt-2 flex items-center gap-1.5 rounded-md border border-dashed border-input px-3 py-2 text-[12px] font-bold text-brand-deep hover:border-brand-deep hover:bg-brand-deep/[.04]"
          @click="addRule"
        >
          <AIcon name="plus" cls="h-3.5 w-3.5" /> Add one
        </button>
      </div>

      <!-- Ready to publish? -->
      <div class="rounded-lg border border-border bg-white shadow-xs">
        <div class="flex items-center justify-between border-b border-border px-5 py-3.5">
          <span class="text-[14px] font-extrabold">Ready to publish?</span>
          <span class="font-mono text-[10.5px]" :class="readiness.length ? 'text-warning' : 'text-success'">
            {{ readiness.length ? readiness.length + ' to fix' : 'nothing to fix' }}
          </span>
        </div>
        <div class="space-y-1.5 p-3">
          <div v-for="(g, k) in readiness" :key="k" class="flex items-center justify-between gap-3 rounded-sm bg-warning/[.07] px-3 py-2">
            <span class="flex items-center gap-2 text-[12.5px] text-warning"><span class="h-1.5 w-1.5 shrink-0 rounded-pill bg-warning" />{{ g.text }}</span>
            <span class="shrink-0 font-mono text-[11px] text-muted-foreground">{{ g.where }}</span>
          </div>
          <div v-if="!readiness.length" class="flex items-center gap-2 rounded-sm bg-success/[.07] px-3 py-2 text-[12.5px] text-success">
            <AIcon name="check" cls="h-3.5 w-3.5" /> Everything is chosen and every activity leads somewhere
          </div>
          <div v-if="usedScanTypes(a).length" class="flex flex-wrap gap-1.5 border-t border-border pt-2.5">
            <span
              v-for="id in usedScanTypes(a)"
              :key="id"
              class="inline-flex items-center gap-1.5 rounded-pill border border-border bg-white px-2 py-0.5 text-[11px] font-bold"
            >
              <span class="h-2 w-2 rounded-pill" :style="{ background: scanType(a, id).swatch }" />{{ scanName(a, id) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
  <ConfirmDialog
    :open="removing != null"
    title="Delete this rule?"
    description="It stops happening on this scene."
    confirm-label="Delete"
    @update:open="(v) => !v && (removing = null)"
    @confirm="removeRule"
  />
</template>
