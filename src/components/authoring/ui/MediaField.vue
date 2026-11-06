<script setup lang="ts">
import { computed, ref } from 'vue'
import { mediaOf } from '@/lib/authoring/engine'
import { thumbOf, type PickKind } from '@/lib/authoring/media'
import AIcon from '../AIcon.vue'
import MediaDialog from './MediaDialog.vue'
import { rowLink, rowRemove } from './styles'

/** The picture, sound or video itself, with its name, or one big button that opens the library. */
const props = defineProps<{ kind: PickKind; modelValue: string | null | undefined; bare?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const open = ref(false)
const chosen = computed(() => mediaOf(props.modelValue))
const src = computed(() => (chosen.value && chosen.value.kind !== 'AUDIO' ? thumbOf(chosen.value.id) : undefined))
const word = computed(
  () => ({ IMAGE: 'a picture', PICTURE: 'a picture', VIDEO: 'a video', AUDIO: 'a sound', VISUAL: 'a picture or video', ILLUSTRATION: 'a drawing' })[props.kind],
)
const icon = computed(() => {
  const k = chosen.value?.kind ?? props.kind
  return k === 'AUDIO' ? 'audio' : k === 'VIDEO' ? 'film' : k === 'ILLUSTRATION' ? 'brush' : 'image'
})

function pick(v: string) {
  open.value = false
  emit('update:modelValue', v)
}
</script>

<template>
  <div>
    <button
      v-if="!modelValue"
      type="button"
      class="flex w-full items-center gap-3 rounded-md border border-dashed border-input bg-surface-2/40 px-3 py-3 text-left text-[14px] font-bold text-brand-deep hover:border-brand-deep hover:bg-brand-deep/[.03] sm:gap-4 sm:px-4 sm:py-4"
      @click="open = true"
    >
      <span class="flex h-11 w-16 shrink-0 items-center justify-center rounded-lg bg-white text-muted-foreground sm:h-14 sm:w-20">
        <AIcon :name="icon" cls="h-6 w-6" />
      </span>
      Choose {{ word }}
    </button>
    <div v-else class="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-border bg-white p-2.5 sm:flex-nowrap sm:gap-4 sm:p-3">
      <span class="relative flex h-11 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-2 text-brand-deep sm:h-14 sm:w-24 sm:rounded-lg">
        <template v-if="src">
          <video v-if="chosen?.kind === 'VIDEO'" :src="`${src}#t=0.1`" muted playsinline preload="metadata" class="h-full w-full object-cover" />
          <img v-else :src="src" alt="" class="h-full w-full object-cover" />
          <span v-if="chosen?.kind === 'VIDEO'" class="absolute inset-0 flex items-center justify-center">
            <span class="flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white"><AIcon name="play" cls="h-3.5 w-3.5" /></span>
          </span>
        </template>
        <AIcon v-else :name="icon" cls="h-6 w-6" />
      </span>
      <span class="min-w-[110px] flex-1 truncate text-[13px] font-semibold sm:min-w-0 sm:text-[14px]">{{ chosen?.name ?? modelValue }}</span>
      <span v-if="!chosen" class="shrink-0 rounded-pill bg-amber-100 px-2.5 py-0.5 text-[12px] font-bold text-warning">Not uploaded yet</span>
      <span class="ml-auto flex shrink-0">
        <button type="button" :class="rowLink" @click="open = true">Change</button>
        <button v-if="!bare" type="button" :class="rowRemove" @click="emit('update:modelValue', '')">Remove</button>
      </span>
    </div>
    <MediaDialog v-if="open" :kind="kind" :model-value="modelValue || ''" @pick="pick" @close="open = false" />
  </div>
</template>
