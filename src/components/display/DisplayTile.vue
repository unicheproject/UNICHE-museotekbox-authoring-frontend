<script setup lang="ts">
import { computed } from 'vue'
import { Amphora } from 'lucide-vue-next'
import type { CardColour } from '@/api/museotekBox'
import type { DisplayTile } from '@/lib/displayIdle'

/**
 * One experience on the idle screen: its name and the card that starts it. Without a start card
 * (none set, or a curator who can't read that experience) the tile shows the name only.
 */
const props = defineProps<{ tile: DisplayTile }>()

const HEX: Record<CardColour, string> = { RED: '#ef4444', GREEN: '#22c55e', YELLOW: '#facc15', WHITE: '#f8fafc' }
const colour = computed(() => props.tile.card?.colour ?? null)
</script>

<template>
  <article class="dsp-tile">
    <div class="dsp-name">{{ tile.name }}</div>
    <div v-if="tile.card" class="dsp-start">
      <span class="dsp-label">Start with</span>
      <span class="dsp-chip">
        <span v-if="colour" class="dsp-dot" :class="{ white: colour === 'WHITE' }" :style="{ background: HEX[colour] }" />
        <span v-else class="dsp-dot object"><Amphora aria-hidden="true" /></span>
        <span class="dsp-card">{{ tile.card.name }}</span>
      </span>
    </div>
  </article>
</template>
