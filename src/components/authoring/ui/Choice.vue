<script setup lang="ts">
import AIcon from '../AIcon.vue'

/** One of a few answers, as a big radio card. */
defineProps<{ on: boolean; label: string; icon?: string }>()
const emit = defineEmits<{ pick: [] }>()
</script>

<template>
  <button
    type="button"
    role="radio"
    :aria-checked="on"
    class="flex items-center gap-3 rounded-md border px-4 py-4 text-left text-[14px] font-bold"
    :class="on ? 'border-brand-deep bg-brand-deep/[.05] text-brand-deep' : 'border-border hover:border-brand-deep/50'"
    @click="emit('pick')"
  >
    <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border" :class="on ? 'border-brand-deep' : 'border-input'">
      <span v-if="on" class="h-3 w-3 rounded-full bg-brand-deep" />
    </span>
    <AIcon v-if="icon" :name="icon" cls="h-5 w-5" />
    {{ label }}
  </button>
</template>
