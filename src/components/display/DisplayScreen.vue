<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import { CloudOff, Package, Unplug } from 'lucide-vue-next'
import type { DisplayTile } from '@/lib/displayIdle'
import IdleTiles from './IdleTiles.vue'
import './display.css'

/**
 * What a Box's display draws, for each state. Pure presentation: Display.vue loads the data and
 * picks the state.
 */
export type DisplayView = 'starting' | 'idle' | 'empty' | 'error' | 'expired'

defineProps<{
  view: DisplayView
  orgName: string
  boxName: string
  tiles: DisplayTile[]
  /** A refresh failed after a good load: the last list stays, with a small note. */
  stale?: boolean
  /** Show "Press F11 for full screen". */
  hint?: boolean
}>()
defineEmits<{ 'sign-in': [] }>()

/** The pointer shows while the mouse moves and hides after this long still, like a full-screen video. */
const CURSOR_IDLE_MS = 3000
const pointer = ref(false)
let cursorTimer: number | undefined
function onMove() {
  pointer.value = true
  window.clearTimeout(cursorTimer)
  cursorTimer = window.setTimeout(() => (pointer.value = false), CURSOR_IDLE_MS)
}
onUnmounted(() => window.clearTimeout(cursorTimer))
</script>

<template>
  <div class="dsp" :class="{ 'dsp-interactive': view === 'expired', 'dsp-pointer': pointer }" @mousemove="onMove">
    <div class="dsp-stage">
      <header v-if="view !== 'expired'" class="dsp-head">
        <div class="dsp-org">{{ orgName || ' ' }}</div>
        <div class="dsp-box">{{ boxName || ' ' }}</div>
        <div v-if="boxName" class="dsp-bar" />
      </header>

      <IdleTiles v-if="view === 'idle'" :tiles="tiles" />

      <main v-else-if="view === 'empty'" class="dsp-main">
        <div class="dsp-message">
          <div class="dsp-message-icon"><Package aria-hidden="true" /></div>
          <h1>No experiences on this box yet</h1>
          <p>Ask a manager to add an experience to this box.</p>
        </div>
      </main>

      <main v-else-if="view === 'error'" class="dsp-main">
        <div class="dsp-message">
          <div class="dsp-message-icon"><CloudOff aria-hidden="true" /></div>
          <h1>Couldn't load this box</h1>
          <p>Trying again in a moment. If this keeps happening, ask a manager for help.</p>
        </div>
      </main>

      <main v-else-if="view === 'expired'" class="dsp-main">
        <div class="dsp-message">
          <div class="dsp-message-icon"><Unplug aria-hidden="true" /></div>
          <h1>This display is no longer connected</h1>
          <p>Sign in again to bring it back.</p>
          <button type="button" class="dsp-btn btn-grad" @click="$emit('sign-in')">Sign in again</button>
        </div>
      </main>

      <main v-else class="dsp-main" aria-busy="true" />

      <div v-if="stale && view === 'idle'" class="dsp-note"><CloudOff aria-hidden="true" />Couldn't refresh · showing the last list</div>
    </div>
    <div class="dsp-hint" :style="{ opacity: hint ? 1 : 0 }" aria-hidden="true">Press F11 for full screen</div>
  </div>
</template>
