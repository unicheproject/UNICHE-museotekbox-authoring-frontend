<script setup lang="ts">
import { computed } from 'vue'
import { mediaOf } from '@/lib/authoring/engine'
import { thumbOf, type PickKind } from '@/lib/authoring/media'
import AIcon from './AIcon.vue'

/**
 * A media field's thumbnail: the picture itself, a video's first frame with a play mark, or the icon
 * of its kind.
 */
const props = defineProps<{ value: string | null | undefined; kind: PickKind }>()

const chosen = computed(() => mediaOf(props.value))
const isVideo = computed(() => chosen.value?.kind === 'VIDEO')
const src = computed(() => (chosen.value && chosen.value.kind !== 'AUDIO' ? thumbOf(chosen.value.id) : undefined))
const icon = computed(() =>
  props.kind === 'AUDIO' ? 'audio' : (chosen.value?.kind ?? props.kind) === 'VIDEO' ? 'film' : props.kind === 'ILLUSTRATION' ? 'brush' : 'image',
)
const box = 'flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-border bg-surface-2'
</script>

<template>
  <span v-if="src && kind !== 'AUDIO'" :class="[box, 'relative']">
    <template v-if="isVideo">
      <!-- #t skips to just after the start, so the browser draws a frame instead of black. -->
      <video :src="`${src}#t=0.1`" muted playsinline preload="metadata" class="h-full w-full object-cover" />
      <span class="absolute inset-0 flex items-center justify-center bg-black/25 text-white"><AIcon name="play" cls="h-3 w-3" /></span>
    </template>
    <img v-else :src="src" alt="" class="h-full w-full object-cover" />
  </span>
  <span v-else :class="[box, value ? 'text-brand-deep' : 'text-muted-foreground']"><AIcon :name="icon" cls="h-4 w-4" /></span>
</template>
