<script setup lang="ts">
import { computed } from 'vue'
import { cap, endLine, hasDisplay, linkInfo, mediaName, num, scanType, template, type Authoring, type FixRow } from '@/lib/authoring/engine'
import { chip, esc } from '@/lib/authoring/html'
import AIcon from './AIcon.vue'

/**
 * The panel beside the flow when no step is open: the visit told as a short story, one numbered line
 * per part (each opens that part), and then whether it is ready to publish or what is still open.
 */
const props = defineProps<{ a: Authoring; fixes: FixRow[] }>()
const emit = defineEmits<{ step: [key: string]; link: [fromKey: string] }>()

/** Lines may carry markup; every name in them is escaped by the engine or here. */
const lines = computed(() => {
  const a = props.a
  const d = a.details
  const welcome = hasDisplay(a) ? d.welcomeMedia : d.welcomeAudio
  const out: { key: string; html: string }[] = [
    {
      key: 'start',
      html: d.startCard
        ? `When ${chip(scanType(a, d.startCard))} is placed on the Box, the visit begins${
            welcome ? ` ${hasDisplay(a) ? 'with' : 'playing'} <b>${esc(mediaName(welcome))}</b>` : ''
          }.`
        : '<b class="text-warning">The object that starts the visit is not chosen yet.</b>',
    },
  ]
  a.islands.forEach((isl, i) => {
    const t = template(isl.templateId)
    const from = i === 0 ? 'start' : a.islands[i - 1].key
    out.push({ key: isl.key, html: `${cap(linkInfo(a, from).phrase)}, the ${esc(t.name)} begins — ${t.summary(a, isl.cfg)}.` })
  })
  const last = linkInfo(a, a.islands.at(-1)?.key ?? 'start')
  out.push({
    key: 'end',
    html: d.goodbye
      ? `${cap(last.phrase)}, a goodbye shows for ${num(d.endSeconds) || 10} s. Then ${endLine(a)}.`
      : `${cap(last.phrase)}, ${endLine(a)}.`,
  })
  return out
})
</script>

<template>
  <section class="min-w-0 rounded-lg border border-border bg-white shadow-xs" aria-label="How this visit runs">
    <div class="flex items-center gap-3 border-b border-border px-6 py-4">
      <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-surface-2 text-brand-deep">
        <AIcon name="route" cls="h-5 w-5" />
      </span>
      <div class="min-w-0">
        <div class="text-[10px] font-extrabold uppercase tracking-overline text-muted-foreground">Overview</div>
        <div class="text-[19px] font-extrabold leading-tight">How this visit runs</div>
      </div>
    </div>

    <ol class="divide-y divide-border">
      <li v-for="(l, i) in lines" :key="l.key">
        <button
          type="button"
          class="flex w-full items-start gap-3 px-6 py-3 text-left text-[13px] leading-relaxed text-secondary-foreground hover:bg-surface-2"
          @click="emit('step', l.key)"
        >
          <span class="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-pill bg-brand-deep text-[10.5px] font-extrabold text-white">
            {{ i + 1 }}
          </span>
          <span class="min-w-0 flex-1" v-html="l.html" />
        </button>
      </li>
    </ol>

    <div class="border-t border-border px-6 py-4">
      <p v-if="!fixes.length" class="flex items-center gap-2 rounded-sm bg-success/[.07] px-3 py-2 text-[12.5px] font-bold text-success">
        <AIcon name="check" cls="h-3.5 w-3.5" /> Everything is ready to publish
      </p>
      <template v-else>
        <div class="mb-2 text-[12.5px] font-extrabold text-warning">{{ fixes.length }} to fix</div>
        <div class="space-y-1.5">
          <button
            v-for="(r, i) in fixes"
            :key="i"
            type="button"
            class="flex w-full items-center justify-between gap-3 rounded-sm bg-warning/[.07] px-3 py-2 text-left hover:bg-warning/[.12]"
            @click="r.link ? emit('link', r.key) : emit('step', r.key)"
          >
            <span class="flex items-center gap-2 text-[12.5px] text-warning">
              <span class="h-1.5 w-1.5 shrink-0 rounded-pill bg-warning" />{{ r.gap }}
            </span>
            <span class="shrink-0 text-[11px] font-bold text-muted-foreground">{{ r.where }}</span>
          </button>
        </div>
      </template>
    </div>
  </section>
</template>
