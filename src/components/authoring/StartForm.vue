<script setup lang="ts">
import { computed } from 'vue'
import { hasDisplay, type Authoring } from '@/lib/authoring/engine'
import MediaField from './ui/MediaField.vue'
import MoveOnCard from './ui/MoveOnCard.vue'
import QCard from './ui/QCard.vue'
import ScanField from './ui/ScanField.vue'

/**
 * The Start's page: the scan that starts the visit, what the visitor sees and hears first, and when
 * they move on to the first activity. Each is its own numbered question, so nothing is folded away.
 */
const props = defineProps<{ a: Authoring }>()
const emit = defineEmits<{ change: [] }>()

// Read live: a reload after someone else's save replaces the details object.
const d = computed(() => props.a.details)
const display = computed(() => hasDisplay(props.a))

function set(key: 'startCard' | 'welcomeMedia' | 'welcomeAudio' | 'welcomeBoxVideo', value: string) {
  d.value[key] = value
  emit('change')
}
</script>

<template>
  <QCard :n="1" title="Which scan starts the visit?" id="start-object" :miss="!d.startCard">
    <ScanField :types="a.scanTypes" :model-value="d.startCard" @update:model-value="set('startCard', $event)" />
  </QCard>
  <QCard v-if="display" :n="2" title="What appears on the screen when it starts?" optional>
    <MediaField kind="VISUAL" :model-value="d.welcomeMedia" @update:model-value="set('welcomeMedia', $event)" />
  </QCard>
  <QCard :n="display ? 3 : 2" title="Does the Box play a sound?" optional>
    <MediaField kind="AUDIO" :model-value="d.welcomeAudio" @update:model-value="set('welcomeAudio', $event)" />
  </QCard>
  <QCard :n="display ? 4 : 3" title="Does the Box play a video?" optional>
    <MediaField kind="VIDEO" :model-value="d.welcomeBoxVideo" @update:model-value="set('welcomeBoxVideo', $event)" />
  </QCard>
  <MoveOnCard :a="a" from-key="start" :n="display ? 5 : 4" @change="emit('change')" />
</template>
