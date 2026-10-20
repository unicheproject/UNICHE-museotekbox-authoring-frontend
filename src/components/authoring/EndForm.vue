<script setup lang="ts">
import { computed } from 'vue'
import { endLine, hasDisplay, type Authoring, type Details } from '@/lib/authoring/engine'
import { inputCls } from '@/lib/authoring/html'
import AField from './AField.vue'
import MediaPicker from './MediaPicker.vue'

/**
 * The End step: an optional goodbye — what it shows and plays, and
 * how long it stays up — and then, in words, what the Box does next.
 */
const props = defineProps<{ a: Authoring }>()
const emit = defineEmits<{ change: [] }>()

// Read live: a reload after someone else's save replaces the details object.
const d = computed(() => props.a.details)

function set<K extends 'goodbye' | 'endMedia' | 'endAudio' | 'endSeconds'>(key: K, value: Details[K]) {
  d.value[key] = value
  emit('change')
}
</script>

<template>
  <div>
    <label class="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        :checked="d.goodbye"
        class="mt-0.5 h-4 w-4 accent-[#4c1d8b]"
        @change="set('goodbye', ($event.target as HTMLInputElement).checked)"
      />
      <span>
        <span class="block text-[13.5px] font-bold">Show a goodbye before the Box goes back to idle</span>
        <span class="block text-[12px] text-muted-foreground">
          A thank-you after the last activity. Without it, the visit ends as soon as the last activity hands over.
        </span>
      </span>
    </label>

    <div v-if="d.goodbye" class="mt-5 grid gap-5 sm:grid-cols-2">
      <AField v-if="hasDisplay(a)" label="Shown on the screen">
        <MediaPicker kind="VISUAL" :model-value="d.endMedia" @update:model-value="set('endMedia', $event)" />
      </AField>
      <AField :label="hasDisplay(a) ? 'Sound from the Box (optional)' : 'Played on the Box'">
        <MediaPicker kind="AUDIO" :model-value="d.endAudio" @update:model-value="set('endAudio', $event)" />
      </AField>
      <AField label="Seconds it stays up">
        <input
          type="number"
          min="1"
          :value="d.endSeconds ?? ''"
          placeholder="10"
          :class="[inputCls, 'max-w-[7rem]']"
          @input="set('endSeconds', ($event.target as HTMLInputElement).value)"
        />
      </AField>
    </div>

    <p class="mt-5 rounded-sm bg-surface-2 px-3 py-2.5 text-[12.5px] text-secondary-foreground" v-html="`Then ${endLine(a)}.`" />
  </div>
</template>
