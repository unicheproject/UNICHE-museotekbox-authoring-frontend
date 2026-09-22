<script setup lang="ts">
import { computed } from 'vue'
import type { ScanObjectDto } from '@/api/museotekBox'
import {
  COMPARE_SYMBOL,
  sceneNameOf,
  type BuiltDocument,
  type Effect,
  type Rule,
} from '@/lib/experienceTemplates'
import ScanObjectChip from './ScanObjectChip.vue'

/**
 * One rule as one sentence. The spec asks the CMS to show the trigger, the condition, the effects
 * and the destination explicitly, in that order — written as a sentence it stays readable without
 * hiding any of the four parts.
 */
const props = defineProps<{ rule: Rule; document: BuiltDocument; objects: ScanObjectDto[] }>()

const trigger = computed(() => props.rule.trigger)

const conditionText = computed(() => {
  const condition = props.rule.condition
  if (!condition) return ''
  return condition.type === 'VAR_CMP'
    ? `${condition.var} ${COMPARE_SYMBOL[condition.op]} ${condition.value}`
    : `${condition.var} is ${condition.value ? 'on' : 'off'}`
})

function effectText(effect: Effect): string {
  if (effect.type === 'SET_NUMBER') return `set ${effect.var} to ${effect.value}`
  if (effect.type === 'ADD_NUMBER') return `add ${effect.amount} to ${effect.var}`
  if (effect.type === 'SET_FLAG') return `turn ${effect.var} ${effect.value ? 'on' : 'off'}`
  return `show “${effect.text}” on the Box`
}

const destinationText = computed(() => {
  const destination = props.rule.destination
  if (destination.type === 'GO_TO') {
    return `go to ${sceneNameOf(props.document, destination.targetSceneKey)}`
  }
  return destination.type === 'STAY' ? 'stay on this scene' : 'end the experience'
})

const tag = 'mr-1.5 rounded-sm px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-overline'
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-y-1 text-[12.5px] leading-relaxed text-secondary-foreground"
  >
    <span :class="[tag, 'bg-brand-deep/10 text-brand-deep']">When</span>
    <span class="mr-2 inline-flex flex-wrap items-center gap-1.5">
      <template v-if="trigger.type === 'SCAN'">
        <ScanObjectChip v-if="trigger.cardTypeId" :id="trigger.cardTypeId" :objects="objects" />
        <b v-else class="text-warning">a card — not chosen yet</b>
        is scanned
      </template>
      <template v-else-if="trigger.type === 'TIMER_ELAPSED'">
        <b>{{ trigger.seconds }} seconds</b> pass here
      </template>
      <template v-else-if="trigger.type === 'VIDEO_ENDED'">the video finishes</template>
      <template v-else-if="trigger.type === 'SCENE_ENTERED'">the visitor arrives here</template>
      <template v-else>the experience starts</template>
    </span>

    <template v-if="rule.condition">
      <span :class="[tag, 'bg-warning/10 text-warning']">Only if</span>
      <span class="mr-2 font-mono font-bold">{{ conditionText }}</span>
    </template>

    <template v-if="rule.effects.length">
      <span :class="[tag, 'bg-success/10 text-success']">Then</span>
      <span class="mr-2">
        <template v-for="(effect, index) in rule.effects" :key="index">
          <span v-if="index" class="mx-1 text-muted-foreground">and</span>
          {{ effectText(effect) }}
        </template>
      </span>
    </template>

    <span :class="[tag, 'bg-info/10 text-info']">Go</span>
    <span>{{ destinationText }}</span>
  </div>
</template>
