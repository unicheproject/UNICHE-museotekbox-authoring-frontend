<script setup lang="ts">
import { hasDisplay, type Authoring, type CustomReply } from '@/lib/authoring/engine'
import { inputCls } from '@/lib/authoring/html'
import AIcon from './AIcon.vue'
import MediaPicker from './MediaPicker.vue'
import SwatchRow from './SwatchRow.vue'
import TypeSelect from './TypeSelect.vue'

/**
 * A wrong answer that deserves its own reply. Everything that is not the right object or the clue
 * gets the same "anything else" reply — unless it is listed here: "the Red card replies, in red,
 * Not a red question". `one` is a single question's list; otherwise it is the whole experience's.
 */
const props = defineProps<{ a: Authoring; rows: CustomReply[]; one: boolean }>()
const emit = defineEmits<{ change: [] }>()

const text = () =>
  props.one
    ? 'On this question only. Pick an object and what it gets instead of the usual wrong reply.'
    : hasDisplay(props.a)
      ? 'Whenever one of these objects is placed and it is not what the Box is waiting for, it gets this reply instead of the usual one — in every activity. E.g. the Red card replies “Not a red question”, in red.'
      : 'Whenever one of these objects is placed and it is not what the Box is waiting for, it gets this sound instead of the usual one — in every activity.'

function set<K extends keyof CustomReply>(k: number, key: K, value: CustomReply[K]) {
  props.rows[k][key] = value
  emit('change')
}
function add() {
  props.rows.push({ scan: '', text: '', color: 'red', audio: '' })
  emit('change')
}
function del(k: number) {
  props.rows.splice(k, 1)
  emit('change')
}
</script>

<template>
  <div>
    <div class="text-[12px] font-bold">{{ one ? 'Wrong answers with their own reply' : 'Objects with a reply of their own' }}</div>
    <p class="mb-2 text-[11.5px] text-muted-foreground">{{ text() }}</p>
    <div class="space-y-1.5">
      <div v-for="(c, k) in rows" :key="k" class="flex flex-wrap items-center gap-2 rounded-sm border border-border bg-white p-2">
        <span class="w-44">
          <TypeSelect :types="a.scanTypes" :model-value="c.scan" cls="py-1 text-[12.5px]" @update:model-value="set(k, 'scan', $event)" />
        </span>
        <input
          v-if="hasDisplay(a)"
          :value="c.text"
          placeholder="What it replies"
          :class="[inputCls, 'min-w-[10rem] flex-[1_1_12rem] py-1 text-[12.5px]']"
          @input="set(k, 'text', ($event.target as HTMLInputElement).value)"
        />
        <span class="w-56">
          <MediaPicker kind="AUDIO" cls="py-1 text-[12.5px]" :model-value="c.audio" @update:model-value="set(k, 'audio', $event)" />
        </span>
        <SwatchRow v-if="hasDisplay(a)" :model-value="c.color" @update:model-value="set(k, 'color', $event)" />
        <button type="button" class="ml-auto rounded-sm p-1 text-muted-foreground hover:bg-surface-2 hover:text-destructive" @click="del(k)">
          <AIcon name="x" cls="h-3.5 w-3.5" />
        </button>
      </div>
      <button
        type="button"
        class="flex items-center gap-1.5 rounded-md border border-dashed border-input px-2.5 py-1.5 text-[11.5px] font-bold text-brand-deep hover:border-brand-deep hover:bg-white"
        @click="add"
      >
        <AIcon name="plus" cls="h-3 w-3" /> {{ one ? 'Add a wrong answer' : 'Add an object' }}
      </button>
    </div>
  </div>
</template>
