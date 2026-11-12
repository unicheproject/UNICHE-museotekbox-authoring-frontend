<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ScanType } from '@/lib/authoring/engine'
import AIcon from '../AIcon.vue'
import ScanDialog from './ScanDialog.vue'
import { rowLink, rowRemove } from './styles'

/** The scan chosen, in one row, or one big button; the scans themselves are picked in a dialog. */
const props = defineProps<{ types: ScanType[]; modelValue: string | null | undefined; optional?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const open = ref(false)
const chosen = computed(() => (props.modelValue ? props.types.find((t) => t.id === props.modelValue) : undefined))
const name = computed(() => chosen.value?.name ?? props.modelValue ?? '')

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
      <span class="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-muted-foreground"><AIcon name="scan" cls="h-6 w-6" /></span>
      Choose a scan
    </button>
    <div v-else class="flex items-center gap-4 rounded-md bg-surface-2 p-3">
      <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-brand-deep"><AIcon name="scan" cls="h-6 w-6" /></span>
      <span class="min-w-0 flex-1 truncate text-[14px] font-bold">{{ name }}</span>
      <span v-if="!chosen" class="shrink-0 rounded-pill bg-warning/10 px-2.5 py-0.5 text-[12px] font-bold text-warning">Not registered yet</span>
      <button type="button" :class="rowLink" @click="open = true">Change</button>
      <button v-if="optional" type="button" :class="rowRemove" @click="emit('update:modelValue', '')">Remove</button>
    </div>
    <ScanDialog v-if="open" :types="types" :model-value="modelValue || ''" @pick="pick" @close="open = false" />
  </div>
</template>
