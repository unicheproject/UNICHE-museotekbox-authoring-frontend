<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import type { ScanType } from '@/lib/authoring/engine'
import AIcon from '../AIcon.vue'
import { bigInput, btnDeep, btnOutline, overlay } from './styles'

/**
 * Every scan the museum has, as tiles, and at the end a way to name one of your own — an experience
 * gets written before the objects are printed, so the author is not held to the list.
 */
const props = defineProps<{ types: ScanType[]; modelValue: string }>()
const emit = defineEmits<{ pick: [value: string]; close: [] }>()

const adding = ref(false)
const typed = ref('')
const box = ref<HTMLInputElement | null>(null)
const own = computed(() => (props.modelValue && !props.types.some((t) => t.id === props.modelValue) ? props.modelValue : null))

async function startAdding() {
  adding.value = true
  await nextTick()
  box.value?.focus()
}
function addOwn() {
  const name = typed.value.trim()
  if (!name) return
  const same = props.types.find((t) => t.name.toLowerCase() === name.toLowerCase())
  emit('pick', same ? same.id : name)
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.stopPropagation()
    emit('close')
  }
}
onMounted(() => window.addEventListener('keydown', onKey, true))
onUnmounted(() => window.removeEventListener('keydown', onKey, true))
</script>

<template>
  <Teleport to="body">
    <div :class="overlay" @click.self="emit('close')">
      <div role="dialog" aria-modal="true" aria-label="Choose a scan" class="dialog-in w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-2xl">
        <div class="flex items-center gap-3 border-b border-border px-7 py-5">
          <h2 class="flex-1 text-[16px] font-extrabold">Choose a scan</h2>
          <button type="button" aria-label="Close" class="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-2" @click="emit('close')">
            <AIcon name="x" cls="h-5 w-5" />
          </button>
        </div>
        <div class="grid max-h-[70vh] gap-2.5 overflow-y-auto p-7 sm:grid-cols-2">
          <button
            v-for="t in types"
            :key="t.id"
            type="button"
            class="flex items-center gap-3 rounded-md border px-4 py-4 text-left text-[14px] font-bold transition-colors"
            :class="modelValue === t.id ? 'border-brand-deep bg-brand-deep/[.06] text-brand-deep' : 'border-border bg-white hover:border-brand-deep/50'"
            @click="emit('pick', t.id)"
          >
            <span class="flex h-7 w-7 shrink-0 items-center justify-center text-brand-deep"><AIcon name="scan" cls="h-6 w-6" /></span>
            <span class="min-w-0 flex-1 truncate">{{ t.name }}</span>
            <AIcon v-if="modelValue === t.id" name="check" cls="h-5 w-5" />
          </button>
          <button
            v-if="own"
            type="button"
            class="flex items-center gap-3 rounded-md border border-brand-deep bg-brand-deep/[.06] px-4 py-4 text-left text-[14px] font-bold text-brand-deep"
            @click="emit('pick', own)"
          >
            <span class="flex h-7 w-7 shrink-0 items-center justify-center"><AIcon name="scan" cls="h-6 w-6" /></span>
            <span class="min-w-0 flex-1 truncate">{{ own }}</span>
            <span class="shrink-0 rounded-pill bg-amber-100 px-2.5 py-0.5 text-[12px] font-bold text-warning">Not registered yet</span>
            <AIcon name="check" cls="h-5 w-5" />
          </button>
          <div v-if="adding" class="rounded-md border border-brand-deep bg-brand-deep/[.03] p-4 sm:col-span-2">
            <div class="flex flex-wrap items-center gap-3">
              <input
                ref="box"
                v-model="typed"
                placeholder="e.g. Parthenon"
                autocomplete="off"
                :class="[bigInput, '!w-auto min-w-0 flex-1 !py-2.5']"
                @keydown.enter="addOwn"
              />
              <button type="button" :disabled="!typed.trim()" :class="[btnDeep, '!py-3']" @click="addOwn">Add</button>
              <button type="button" :class="[btnOutline, '!py-3']" @click="adding = false">Cancel</button>
            </div>
          </div>
          <button
            v-else
            type="button"
            class="flex items-center justify-center gap-2 rounded-md border border-dashed border-brand-deep/30 px-4 py-4 text-[14px] font-extrabold text-brand-deep hover:border-brand-deep hover:bg-brand-deep/[.03] sm:col-span-2"
            @click="startAdding"
          >
            <AIcon name="plus" cls="h-5 w-5" />Something else…
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
