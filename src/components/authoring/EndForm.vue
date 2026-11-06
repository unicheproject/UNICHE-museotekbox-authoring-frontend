<script setup lang="ts">
import { computed } from 'vue'
import { hasDisplay, type Authoring, type Details } from '@/lib/authoring/engine'
import Choice from './ui/Choice.vue'
import MediaField from './ui/MediaField.vue'
import QCard from './ui/QCard.vue'
import Seconds from './ui/Seconds.vue'
import Sub from './ui/Sub.vue'

/** The End's page: whether a goodbye shows, what it shows and plays, and how long it stays. */
const props = defineProps<{ a: Authoring }>()
const emit = defineEmits<{ change: [] }>()

// Read live: a reload after someone else's save replaces the details object.
const d = computed(() => props.a.details)
const display = computed(() => hasDisplay(props.a))

function set<K extends 'goodbye' | 'endMedia' | 'endAudio' | 'endSeconds'>(key: K, value: Details[K]) {
  d.value[key] = value
  emit('change')
}
</script>

<template>
  <QCard :n="1" title="Show a goodbye at the end?">
    <div class="grid gap-3 sm:grid-cols-2">
      <Choice :on="d.goodbye" label="Yes" @pick="set('goodbye', true)" />
      <Choice :on="!d.goodbye" label="No, end straight away" @pick="set('goodbye', false)" />
    </div>
  </QCard>
  <template v-if="d.goodbye">
    <QCard :n="2" :title="display ? 'What does the goodbye show?' : 'What does the goodbye play?'" optional>
      <MediaField v-if="display" kind="VISUAL" :model-value="d.endMedia" @update:model-value="set('endMedia', $event)" />
      <div v-if="display" class="mt-5"><Sub title="Sound from the Box" optional /></div>
      <MediaField kind="AUDIO" :model-value="d.endAudio" @update:model-value="set('endAudio', $event)" />
    </QCard>
    <QCard :n="3" title="How long does it stay?">
      <Seconds :model-value="d.endSeconds" @update:model-value="set('endSeconds', $event)" />
    </QCard>
  </template>
</template>
