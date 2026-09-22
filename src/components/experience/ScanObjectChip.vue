<script setup lang="ts">
import { computed } from 'vue'
import { resolveScanObjectKind, type ScanObjectDto } from '@/api/museotekBox'

/** One scan object as a chip: its name, with the colour it can be recognised by. */
const props = defineProps<{ id: string; objects: ScanObjectDto[] }>()

const object = computed(() => props.objects.find((o) => String(o.id) === props.id))

// The swatch is a recognition aid, not data: a coloured card shows its colour, everything else the
// colour its kind is drawn in throughout the app.
const COLOURS: Record<string, string> = {
  RED: '#c0185e',
  GREEN: '#0f7a6e',
  YELLOW: '#9a6200',
  WHITE: '#9ca3af',
}
const KIND_COLOURS: Record<string, string> = {
  PRINTED_IMAGE: '#2d5aa0',
  THREE_D_PRINTED_OBJECT: '#b05fd6',
  DRAFT: '#9a6200',
}

const swatch = computed(() => {
  const found = object.value
  if (!found) return '#9ca3af'
  if (found.colour && COLOURS[found.colour]) return COLOURS[found.colour]
  const kind = resolveScanObjectKind(found.kind)
  return (kind && KIND_COLOURS[kind]) || '#9ca3af'
})
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-pill border border-border bg-card px-2 py-0.5 text-[11px] font-bold"
  >
    <span class="h-2 w-2 rounded-pill" :style="{ background: swatch }" />
    {{ object?.name ?? '—' }}
  </span>
</template>
