<script setup lang="ts">
import { computed } from 'vue'
import { hasDisplay, type Authoring } from '@/lib/authoring/engine'
import AField from './AField.vue'
import MediaPicker from './MediaPicker.vue'
import TypeSelect from './TypeSelect.vue'

/**
 * The Start step: the object that starts the visit, and what the
 * visitor sees and hears first, on the screen and on the Box.
 */
const props = defineProps<{ a: Authoring }>()
const emit = defineEmits<{ change: [] }>()

// Read live: a reload after someone else's save replaces the details object.
const d = computed(() => props.a.details)

function set(key: 'startCard' | 'welcomeMedia' | 'welcomeAudio' | 'welcomeBoxVideo', value: string) {
  d.value[key] = value
  emit('change')
}
</script>

<template>
  <div class="grid gap-5 sm:grid-cols-2">
    <AField label="Object that starts the experience" help="The Box sits idle and open. Placing this object on it begins the visit.">
      <TypeSelect :types="a.scanTypes" :model-value="d.startCard" @update:model-value="set('startCard', $event)" />
    </AField>
    <AField
      v-if="hasDisplay(a)"
      label="What the visitor sees first (optional)"
      help="A welcome on the screen, the moment the visit begins."
    >
      <MediaPicker kind="VISUAL" :model-value="d.welcomeMedia" @update:model-value="set('welcomeMedia', $event)" />
    </AField>
    <AField v-else label="What the visitor hears first (optional)" help="A welcome, played the moment the visit begins.">
      <MediaPicker kind="AUDIO" :model-value="d.welcomeAudio" @update:model-value="set('welcomeAudio', $event)" />
    </AField>
    <AField v-if="hasDisplay(a)" label="Sound from the Box (optional)" help="Plays with the welcome.">
      <MediaPicker kind="AUDIO" :model-value="d.welcomeAudio" @update:model-value="set('welcomeAudio', $event)" />
    </AField>
    <AField label="Video on the Box (optional)" help="Plays on the Box’s own display when the visit begins.">
      <MediaPicker kind="VIDEO" :model-value="d.welcomeBoxVideo" @update:model-value="set('welcomeBoxVideo', $event)" />
    </AField>
  </div>
</template>
