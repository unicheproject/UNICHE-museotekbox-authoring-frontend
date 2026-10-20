<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { describeError } from '@/api/museotekBox'
import { MEDIA, mediaOf } from '@/lib/authoring/engine'
import { acceptFor, addToLibrary, kindsFor, type PickKind } from '@/lib/authoring/media'
import { inputCls } from '@/lib/authoring/html'
import MediaThumb from './MediaThumb.vue'

/**
 * Choosing media: a thumbnail of what is chosen and a list of what the museum has
 * in its media library. "Upload a file…" adds a new file to the library and chooses it.
 * "Something else…" swaps in a text box to name a file that is not uploaded yet; "List" goes back.
 */
const props = defineProps<{ modelValue: string; kind: PickKind; cls?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const list = computed(() => MEDIA.filter((m) => kindsFor(props.kind).includes(m.kind)))
const known = computed(() => list.value.some((m) => m.id === props.modelValue))
const chosen = computed(() => mediaOf(props.modelValue))

const file = ref<HTMLInputElement | null>(null)
const progress = ref<number | null>(null)
const error = ref<string | null>(null)
const typing = ref(false)
const box = ref<HTMLInputElement | null>(null)

async function onSelect(event: Event) {
  const select = event.target as HTMLSelectElement
  if (select.value === '__new') {
    select.value = props.modelValue
    typing.value = true
    await nextTick()
    box.value?.focus()
    return
  }
  if (select.value === '__upload') {
    select.value = props.modelValue
    file.value?.click()
    return
  }
  emit('update:modelValue', select.value)
}

async function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  const picked = input.files?.[0]
  input.value = ''
  if (!picked) return
  error.value = null
  progress.value = 0
  try {
    const item = await addToLibrary(picked, (p) => (progress.value = p))
    emit('update:modelValue', item.id)
  } catch (e) {
    error.value = describeError(e)
  } finally {
    progress.value = null
  }
}
</script>

<template>
  <span class="block">
    <span class="flex items-center gap-2">
      <MediaThumb :value="modelValue" :kind="kind" />
      <span class="min-w-0 flex-1">
        <span v-if="progress != null" :class="[inputCls, cls, 'block text-muted-foreground']">Uploading… {{ progress }}%</span>
        <span v-else-if="typing" class="flex items-center gap-1.5">
          <input
            ref="box"
            :value="modelValue"
            placeholder="Name the file you will upload"
            :class="[inputCls, cls]"
            @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
          />
          <button
            type="button"
            title="Back to the list"
            class="shrink-0 rounded-md border border-input bg-white px-2.5 py-2 text-[11px] font-extrabold uppercase tracking-button text-brand-deep hover:bg-surface-2"
            @click="typing = false"
          >
            List
          </button>
        </span>
        <select v-else :value="modelValue" :class="[inputCls, cls]" @change="onSelect">
          <option value="">Nothing chosen yet</option>
          <option v-for="m in list" :key="m.id" :value="m.id">{{ m.name }}</option>
          <option v-if="modelValue && !known" :value="modelValue">{{ chosen?.name ?? modelValue }} — your own file</option>
          <option value="__upload">Upload a file…</option>
          <option value="__new">Something else…</option>
        </select>
      </span>
    </span>
    <span v-if="error" class="mt-1 block text-[11.5px] font-bold text-destructive">{{ error }}</span>
    <input ref="file" type="file" :accept="acceptFor(kind)" class="hidden" @change="onFile" />
  </span>
</template>
