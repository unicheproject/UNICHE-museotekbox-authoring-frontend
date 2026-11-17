<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { CreditCard } from 'lucide-vue-next'
import { paginate, type DisplayTile as Tile } from '@/lib/displayIdle'
import DisplayTile from './DisplayTile.vue'

/**
 * The tiles of the idle screen and the "place a card" line. More than four share pages evenly and
 * rotate on a slow timer, because nobody can scroll a TV.
 */
const props = defineProps<{ tiles: Tile[] }>()

const PAGE_MS = 12000

const pages = computed(() => paginate(props.tiles))
const page = ref(0)
// The layout follows the largest page, so tiles keep one size while the pages rotate.
const layout = computed(() => `n${Math.min(pages.value[0]?.length ?? 1, 4)}`)

// A refresh can shorten the list under the current page.
watch(pages, (p) => {
  if (page.value >= p.length) page.value = 0
})

const timer = window.setInterval(() => {
  if (pages.value.length > 1) page.value = (page.value + 1) % pages.value.length
}, PAGE_MS)
onUnmounted(() => window.clearInterval(timer))
</script>

<template>
  <main class="dsp-main">
    <Transition name="dsp-fade" mode="out-in">
      <div :key="page" class="dsp-grid" :class="layout">
        <DisplayTile v-for="t in pages[page] ?? []" :key="t.id" :tile="t" />
      </div>
    </Transition>
  </main>
  <footer class="dsp-foot">
    <div class="dsp-cta">
      <CreditCard aria-hidden="true" />
      <span>Place a card on the box to begin</span>
    </div>
    <div v-if="pages.length > 1" class="dsp-pages" aria-hidden="true">
      <i v-for="(_, i) in pages" :key="i" :class="{ on: i === page }" />
      <span>&nbsp;{{ page + 1 }} / {{ pages.length }}</span>
    </div>
  </footer>
</template>
