<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import type { ScanType } from '@/lib/authoring/engine'
import { inputCls } from '@/lib/authoring/html'

/**
 * An object, picked from the kinds the museum has registered. The author is not held to that list —
 * an experience gets written before the objects are printed — so it ends with "Something else…",
 * which swaps in a plain text box; "List" goes back.
 */
const props = defineProps<{ types: ScanType[]; modelValue: string; cls?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const known = computed(() => props.types.some((t) => t.id === props.modelValue))
const typing = ref(false)
const box = ref<HTMLInputElement | null>(null)

async function onSelect(event: Event) {
  const select = event.target as HTMLSelectElement
  if (select.value === '__new') {
    select.value = props.modelValue || ''
    typing.value = true
    await nextTick()
    box.value?.focus()
    return
  }
  emit('update:modelValue', select.value)
}
</script>

<template>
  <span v-if="typing" class="flex items-center gap-1.5">
    <input
      ref="box"
      :value="modelValue || ''"
      placeholder="Name it — you can register it later"
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
  <select v-else :value="modelValue || ''" :class="[inputCls, cls]" @change="onSelect">
    <option value="">Choose an object…</option>
    <option v-for="t in types" :key="t.id" :value="t.id">{{ t.name }}</option>
    <option v-if="modelValue && !known" :value="modelValue">{{ modelValue }} — not registered yet</option>
    <option value="__new">Something else…</option>
  </select>
</template>
