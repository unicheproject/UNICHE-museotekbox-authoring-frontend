<script setup lang="ts">
import { computed } from 'vue'
import type { CommentThreadDto } from '@/api/museotekBox'
import { relTime, type Comments } from '@/lib/authoring/useComments'
import { btnPrimary, inputCls } from '@/lib/authoring/html'

/**
 * One thread, drawn for the light page or the dark test run. It starts folded — the first comment
 * on two lines and how many replies — and clicking opens the rest, so a long discussion never takes
 * over the page. One reply is written at a time, wherever it is.
 */
const props = withDefaults(
  defineProps<{ thread: CommentThreadDto; comments: Comments; sceneName: string; dark?: boolean; showScene?: boolean }>(),
  { dark: false, showScene: true },
)

const UI = {
  light: {
    card: 'border border-border bg-white',
    meta: 'text-muted-foreground',
    name: 'text-secondary-foreground',
    text: 'text-foreground',
    link: 'text-brand-deep hover:underline',
    input: inputCls,
    send: btnPrimary,
    rule: 'border-border',
    avatar: 'bg-brand-deep/[.1] text-brand-deep',
  },
  dark: {
    card: 'border border-white/10 bg-white/[.04]',
    meta: 'text-white/45',
    name: 'text-white/80',
    text: 'text-white/90',
    link: 'text-brand-cyan hover:underline',
    input:
      'w-full resize-none rounded-md border border-white/15 bg-white/5 px-3 py-2 text-[13px] text-white placeholder:text-white/35 outline-none focus:border-brand-cyan',
    send: 'rounded-md bg-white px-3 py-1.5 text-[12px] font-extrabold text-surface-dark hover:bg-white/90 disabled:opacity-40',
    rule: 'border-white/10',
    avatar: 'bg-white/15 text-white/70',
  },
}
const ui = computed(() => UI[props.dark ? 'dark' : 'light'])

const where = computed(() => (props.dark ? 'emu' : 'page'))
const state = props.comments.ui
const replying = computed(() => state.reply.root === props.thread.id && state.reply.where === where.value)
const open = computed(() => replying.value || state.open.has(props.thread.id))

function expand() {
  const id = props.thread.id
  if (state.open.has(id)) state.open.delete(id)
  else state.open.add(id)
}
function startReply() {
  state.reply.root = props.thread.id
  state.reply.text = ''
  state.reply.where = where.value
}
function cancel() {
  state.reply.root = null
  state.reply.text = ''
}
async function send() {
  const root = props.thread.id
  const text = state.reply.text
  cancel()
  const ok = await props.comments.reply(root, text)
  if (!ok) {
    state.reply.root = root
    state.reply.text = text
    state.reply.where = where.value
  }
}

const vFocus = { mounted: (el: HTMLElement) => el.focus() }
</script>

<template>
  <div class="rounded-md px-3 py-2.5" :class="[ui.card, thread.resolved && 'opacity-70']">
    <div
      v-if="showScene"
      class="mb-1.5 flex items-center justify-between gap-2 text-[10.5px] font-bold uppercase tracking-overline"
      :class="ui.meta"
    >
      <span class="truncate">“{{ sceneName }}”</span>
      <span v-if="thread.resolved" class="shrink-0">Resolved</span>
    </div>

    <div class="flex gap-2">
      <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-pill text-[9px] font-extrabold" :class="ui.avatar">
        {{ thread.authorName.charAt(0).toUpperCase() }}
      </span>
      <div class="min-w-0 flex-1">
        <div class="text-[11px]" :class="ui.meta"><b :class="ui.name">{{ thread.authorName }}</b> · {{ relTime(thread.createdAt) }}</div>
        <div
          class="whitespace-pre-wrap break-words text-[13px] leading-snug"
          :class="[ui.text, !open && 'line-clamp-2 cursor-pointer']"
          @click="expand"
        >{{ thread.body }}</div>
      </div>
    </div>

    <div v-if="open && thread.replies.length" class="ml-7 mt-1 border-l-2 pl-3" :class="ui.rule">
      <div v-for="r in thread.replies" :key="r.id" class="mt-2.5 flex gap-2">
        <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-pill text-[9px] font-extrabold" :class="ui.avatar">
          {{ r.authorName.charAt(0).toUpperCase() }}
        </span>
        <div class="min-w-0 flex-1">
          <div class="text-[11px]" :class="ui.meta"><b :class="ui.name">{{ r.authorName }}</b> · {{ relTime(r.createdAt) }}</div>
          <div class="whitespace-pre-wrap break-words text-[13px] leading-snug" :class="ui.text">{{ r.body }}</div>
        </div>
      </div>
    </div>

    <div v-if="replying" class="ml-7 mt-2">
      <textarea v-model="state.reply.text" v-focus rows="2" placeholder="Reply…" :class="[ui.input, 'py-1.5 text-[12.5px]']" />
      <div class="mt-1.5 flex items-center justify-end gap-3">
        <button type="button" class="text-[12px] font-bold hover:underline" :class="ui.meta" @click="cancel">Cancel</button>
        <button type="button" :class="ui.send" :disabled="!state.reply.text.trim()" @click="send">Reply</button>
      </div>
    </div>
    <div v-else class="ml-7 mt-2 flex items-center gap-4 text-[11.5px] font-bold">
      <button v-if="thread.replies.length" type="button" class="hover:underline" :class="ui.meta" @click="expand">
        {{ open ? 'Hide replies' : `${thread.replies.length} repl${thread.replies.length === 1 ? 'y' : 'ies'}` }}
      </button>
      <button type="button" :class="ui.link" @click="startReply">Reply</button>
      <button type="button" :class="ui.link" @click="comments.setResolved(thread.id, !thread.resolved)">
        {{ thread.resolved ? 'Reopen' : 'Resolve' }}
      </button>
    </div>
  </div>
</template>
