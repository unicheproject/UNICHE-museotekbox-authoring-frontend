<script setup lang="ts">
import { useRouter } from 'vue-router'
import AIcon from '../AIcon.vue'

/** Where you are, the same on every page of an experience: Experiences › its name › … Every part but the last is a link. */
defineProps<{ parts: { text: string; to?: string }[] }>()
const router = useRouter()
</script>

<template>
  <nav aria-label="You are here" class="mb-3 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] font-semibold">
    <template v-for="(p, i) in parts" :key="i">
      <AIcon v-if="i" name="chev" cls="h-3.5 w-3.5 text-muted-foreground/60" />
      <button
        v-if="i < parts.length - 1 && p.to"
        type="button"
        class="max-w-[220px] truncate text-muted-foreground hover:text-brand-deep hover:underline"
        @click="router.push(p.to)"
      >
        {{ p.text }}
      </button>
      <span v-else aria-current="page" class="max-w-[260px] truncate text-foreground">{{ p.text }}</span>
    </template>
  </nav>
</template>
