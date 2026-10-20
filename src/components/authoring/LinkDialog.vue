<script setup lang="ts">
import { computed } from 'vue'
import { esc, inputCls } from '@/lib/authoring/html'
import { LINK_HOW, cap, hasDisplay, linkInfo, newLink, type Authoring, type Link, type LinkHow } from '@/lib/authoring/engine'
import DialogShell from './DialogShell.vue'
import TypeSelect from './TypeSelect.vue'

/** How the visitor moves on from one step to the next. */
const props = defineProps<{ a: Authoring; fromKey: string }>()
const emit = defineEmits<{ close: []; change: [] }>()

const info = computed(() => linkInfo(props.a, props.fromKey))

/** The link being edited, created on first edit if the step has none yet. */
function link(): Link {
  if (props.fromKey === 'start') return props.a.details.startNext
  const isl = props.a.islands.find((x) => x.key === props.fromKey)!
  if (!isl.next) isl.next = newLink()
  return isl.next
}

// "Right away" only leaves the Start; "when the video ends" needs a screen to play it on.
const choices = computed(() =>
  (Object.entries(LINK_HOW) as [LinkHow, string][]).filter(
    ([k]) => (k !== 'now' || props.fromKey === 'start') && (k !== 'video' || hasDisplay(props.a)),
  ),
)

function set<K extends keyof Link>(key: K, value: Link[K]) {
  link()[key] = value
  emit('change')
}

const title = computed(
  () => `${esc(info.value.fromName)} <span class="text-muted-foreground">→</span> ${esc(cap(info.value.target))}`,
)
</script>

<template>
  <DialogShell kicker="Moving on" :title="title" @close="emit('close')">
    <div class="space-y-4">
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-[13px] font-bold text-muted-foreground">Move on</span>
        <select
          :value="info.link.how"
          :class="[inputCls, 'w-auto max-w-sm']"
          @change="set('how', ($event.target as HTMLSelectElement).value as LinkHow)"
        >
          <option v-for="[k, lab] in choices" :key="k" :value="k">{{ lab }}</option>
        </select>
        <template v-if="info.link.how === 'time'">
          <input
            type="number"
            min="1"
            :value="info.link.seconds ?? ''"
            placeholder="10"
            :class="[inputCls, 'w-auto max-w-[6rem]']"
            @input="set('seconds', ($event.target as HTMLInputElement).value)"
          />
          <span class="text-[13px] text-muted-foreground">seconds</span>
        </template>
        <TypeSelect
          v-if="info.link.how === 'scan'"
          :types="a.scanTypes"
          :model-value="info.link.scan"
          cls="w-auto max-w-[14rem]"
          @update:model-value="set('scan', $event)"
        />
      </div>
      <p v-if="info.warn" class="rounded-sm bg-warning/[.07] px-3 py-2 text-[12.5px] font-bold text-warning" v-html="info.warn" />
      <p
        class="rounded-sm bg-surface-2 px-3 py-2.5 text-[12.5px] text-secondary-foreground"
        v-html="`Then, ${info.phrase}, the visitor goes on to <b>${esc(info.target)}</b>.`"
      />
    </div>
  </DialogShell>
</template>
