<script setup lang="ts">
import { onUnmounted, watch } from 'vue'
import AIcon from '@/components/authoring/AIcon.vue'
import {
  btnDeep,
  btnOutline,
  dialogBody,
  dialogBox,
  dialogClose,
  dialogFoot,
  dialogHead,
  dialogSub,
  dialogTitle,
  overlay,
} from '@/components/authoring/ui/styles'

/**
 * A form in a dialog, drawn like the "New experience" dialog (the authoring dialog pattern): the
 * title, the fields, and Cancel / the action at the foot with any error above them. Same props and
 * events as the ui kit's FormDialog, so a screen swaps one for the other. Enter submits; Escape
 * and the backdrop close it, except while saving.
 */
const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    sub?: string
    submitLabel?: string
    busy?: boolean
    error?: string | null
    submitDisabled?: boolean
  }>(),
  { sub: '', submitLabel: 'Save', busy: false, error: null, submitDisabled: false },
)
const emit = defineEmits<{ 'update:open': [open: boolean]; submit: [] }>()

function close() {
  // A save in flight must not be abandoned half-way — the request would still land.
  if (!props.busy) emit('update:open', false)
}
function submit() {
  if (!props.busy && !props.submitDisabled) emit('submit')
}
function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

watch(
  () => props.open,
  (open) => (open ? window.addEventListener('keydown', onKey) : window.removeEventListener('keydown', onKey)),
  { immediate: true },
)
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div v-if="open" :class="overlay" @click.self="close">
      <form role="dialog" aria-modal="true" :aria-label="title" :class="[dialogBox, 'max-w-xl']" @submit.prevent="submit">
        <div :class="[dialogHead, 'items-center']">
          <div class="min-w-0 flex-1">
            <h2 :class="dialogTitle">{{ title }}</h2>
            <p v-if="sub" :class="dialogSub">{{ sub }}</p>
          </div>
          <button type="button" title="Close" aria-label="Close" :class="dialogClose" @click="close">
            <AIcon name="x" cls="h-5 w-5" />
          </button>
        </div>
        <div :class="[dialogBody, 'space-y-5']"><slot /></div>
        <div :class="dialogFoot">
          <p v-if="error" role="alert" class="w-full rounded-md bg-destructive/[.06] px-3 py-2 text-[13px] font-bold text-destructive">
            {{ error }}
          </p>
          <button type="button" :class="btnOutline" :disabled="busy" @click="close">Cancel</button>
          <button type="submit" :class="btnDeep" :disabled="busy || submitDisabled">{{ busy ? 'Saving…' : submitLabel }}</button>
        </div>
      </form>
    </div>
  </Teleport>
</template>
