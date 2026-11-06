<script setup lang="ts">
import { computed } from 'vue'
import { hasDisplay, linkInfo, newLink, type Authoring, type Link, type LinkHow } from '@/lib/authoring/engine'
import AIcon from '../AIcon.vue'
import Choice from './Choice.vue'
import QCard from './QCard.vue'
import ScanField from './ScanField.vue'
import Seconds from './Seconds.vue'

/** The last question of a step's page: when the visitor moves on to the next step. */
const props = defineProps<{ a: Authoring; fromKey: string; n: number }>()
const emit = defineEmits<{ change: [] }>()

const info = computed(() => linkInfo(props.a, props.fromKey))

/** The hand-over being edited, created on first edit if the step has none yet. */
function link(): Link {
  if (props.fromKey === 'start') return props.a.details.startNext
  const isl = props.a.islands.find((x) => x.key === props.fromKey)!
  if (!isl.next) isl.next = newLink()
  return isl.next
}
function set<K extends keyof Link>(key: K, value: Link[K]) {
  link()[key] = value
  emit('change')
}

// "Right away" only leaves the Start; "when the video ends" needs a screen to play it on.
const ways = computed(() =>
  (
    [
      ['now', 'fast', 'Right away'],
      ['time', 'timer', 'After some seconds'],
      ['video', 'film', 'When the video ends'],
      ['scan', 'scan', 'When they place a scan'],
      ['any', 'scan', 'When they place any scan'],
    ] as [LinkHow, string, string][]
  ).filter(([k]) => (k !== 'now' || props.fromKey === 'start') && (k !== 'video' || hasDisplay(props.a))),
)
</script>

<template>
  <QCard :n="n" :title="`When does the visitor move on to ${info.target}?`" id="next" :miss="!!info.warn">
    <div class="grid gap-3 sm:grid-cols-2">
      <Choice v-for="[k, icon, label] in ways" :key="k" :on="info.link.how === k" :icon="icon" :label="label" @pick="set('how', k)" />
    </div>
    <div v-if="info.link.how === 'time'" class="mt-5">
      <Seconds :model-value="info.link.seconds" @update:model-value="set('seconds', $event)" />
    </div>
    <div v-else-if="info.link.how === 'scan'" class="mt-5">
      <ScanField :types="a.scanTypes" :model-value="info.link.scan" @update:model-value="set('scan', $event)" />
    </div>
    <p v-else-if="info.warn" class="mt-5 flex items-center gap-2.5 rounded-md bg-amber-50 px-4 py-3 text-[13.5px] font-bold text-warning">
      <AIcon name="alert" cls="h-5 w-5" /><span v-html="info.warn" />
    </p>
  </QCard>
</template>
