<script setup lang="ts">
import { btnPrimary } from '@/lib/authoring/html'
import AIcon from './AIcon.vue'
import { dialogBody, dialogBox, dialogClose, dialogFoot, dialogHead, dialogTitle, overlay } from './ui/styles'

/**
 * A dialog over the page: a kicker and a title, the body, and a Done button. The page underneath
 * does not scroll while it is open (the `overlay` class locks it, see globals.css).
 */
withDefaults(defineProps<{ kicker: string; title: string; sub?: string; foot?: boolean; boxClass?: string }>(), {
  sub: '',
  foot: true,
  boxClass: 'max-w-[62rem]',
})
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <div :class="overlay" @click.self="emit('close')">
      <div role="dialog" aria-modal="true" :class="[dialogBox, boxClass]">
        <div :class="dialogHead">
          <div class="min-w-0 flex-1">
            <div class="text-[10px] font-extrabold uppercase tracking-overline text-muted-foreground">{{ kicker }}</div>
            <div :class="dialogTitle" v-html="title" />
            <div v-if="sub" class="mt-1 text-[13px] leading-snug text-secondary-foreground">{{ sub }}</div>
          </div>
          <button type="button" title="Close" aria-label="Close" :class="dialogClose" @click="emit('close')">
            <AIcon name="x" cls="h-5 w-5" />
          </button>
        </div>
        <div :class="dialogBody"><slot /></div>
        <div v-if="foot" :class="dialogFoot">
          <button type="button" :class="btnPrimary" @click="emit('close')">Done</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
