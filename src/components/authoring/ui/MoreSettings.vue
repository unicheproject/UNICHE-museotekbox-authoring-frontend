<script setup lang="ts">
import { ref } from 'vue'
import AIcon from '../AIcon.vue'

/** The rare settings of a page, folded away under one line. */
const open = ref(false)
</script>

<template>
  <div class="rounded-lg bg-white shadow-xs">
    <button
      type="button"
      :aria-expanded="open"
      class="flex w-full items-center gap-3 px-6 py-5 text-left text-[14px] font-extrabold sm:px-7"
      @click="open = !open"
    >
      <AIcon name="gear" cls="h-5 w-5 text-muted-foreground" />
      <span class="flex-1">More settings</span>
      <span class="text-muted-foreground transition-transform" :class="open ? '-rotate-90' : 'rotate-90'"><AIcon name="chev" cls="h-5 w-5" /></span>
    </button>
    <div v-if="open" class="space-y-6 border-t border-border px-6 py-6 sm:px-7"><slot /></div>
  </div>
</template>
