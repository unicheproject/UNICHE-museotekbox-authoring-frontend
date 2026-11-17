<script setup lang="ts">
import { computed } from 'vue'
import type { Authoring, FixRow } from '@/lib/authoring/engine'
import { stepGlyph, stepKeys, stepTitle, stepTone } from '@/lib/authoring/tone'
import AIcon from './AIcon.vue'
import { btnDeep } from './ui/styles'

/**
 * An experience's overview, under the shared header and the row of steps (which already shows every
 * step, what it does and whether it is ready): one card saying whether it can be published and, if
 * not, everything still to fix, step by step, each a click away from where it is fixed.
 */
const props = defineProps<{
  a: Authoring
  published: boolean
  fixes: FixRow[]
}>()
const emit = defineEmits<{
  step: [key: string]
  link: [fromKey: string]
}>()

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
function fix(r: FixRow) {
  if (r.link) emit('link', r.key)
  else emit('step', r.key)
}

const keys = computed(() => stepKeys(props.a))
/** What is missing, grouped by step in visit order; the same gap said twice is listed once. */
const groups = computed(() =>
  keys.value
    .map((k) => {
      const seen = new Map<string, { row: FixRow; n: number }>()
      for (const r of props.fixes.filter((x) => x.key === k)) {
        const id = `${r.link}|${r.gap}`
        const got = seen.get(id)
        if (got) got.n++
        else seen.set(id, { row: r, n: 1 })
      }
      return { k, count: props.fixes.filter((x) => x.key === k).length, rows: [...seen.values()] }
    })
    .filter((g) => g.rows.length),
)
const ready = computed(() => keys.value.filter((k) => !props.fixes.some((r) => r.key === k)))
const readyNames = computed(() => {
  const n = ready.value.map((k) => stepTitle(props.a, k))
  return n.length > 1 ? `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}` : n[0]
})
</script>

<template>
  <section class="mb-12 rounded-lg bg-white p-5 shadow-xs sm:p-6">
    <div class="flex flex-wrap items-center gap-x-6 gap-y-4">
      <div class="min-w-[220px] flex-1">
        <h2 class="text-lg font-semibold leading-snug">
          <template v-if="fixes.length">{{ fixes.length }} thing{{ fixes.length === 1 ? '' : 's' }} to fix before publishing</template>
          <template v-else-if="published">Published and up to date</template>
          <template v-else>Ready to publish</template>
        </h2>
        <p class="mt-0.5 text-[13px] text-muted-foreground">
          <template v-if="fixes.length">{{ ready.length }} of {{ keys.length }} steps ready</template>
          <template v-else-if="published">Use Publish, at the top, to change which Boxes play it.</template>
          <template v-else>Every step is ready. Use Publish, at the top, to choose the Boxes it plays on.</template>
        </p>
        <div class="mt-3 h-1 max-w-sm overflow-hidden rounded-pill bg-surface-2" aria-hidden="true">
          <div class="h-full rounded-pill bg-success transition-[width]" :style="{ width: `${(ready.length / keys.length) * 100}%` }" />
        </div>
      </div>
      <button v-if="fixes.length" type="button" :class="[btnDeep, 'w-full sm:w-auto']" @click="fix(fixes[0])">
        Fix next<AIcon name="arrow" />
      </button>
    </div>

    <div v-if="groups.length" class="mt-6">
      <div
        v-for="g in groups"
        :key="g.k"
        class="grid gap-x-6 gap-y-2 border-t border-border py-5 last:pb-0 sm:grid-cols-[200px_1fr]"
      >
        <div>
          <button type="button" class="flex items-center gap-2 text-[14px] font-semibold hover:text-brand-deep" @click="emit('step', g.k)">
            <span :style="{ color: stepTone(a, g.k)[0] }"><AIcon :name="stepGlyph(a, g.k)" cls="h-5 w-5" /></span>
            {{ stepTitle(a, g.k) }}
          </button>
          <div class="mt-0.5 pl-7 text-[12px] font-medium text-warning">{{ g.count }} to fix</div>
        </div>
        <ul class="min-w-0 space-y-0.5 pl-7 sm:pl-0">
          <li v-for="x in g.rows" :key="`${x.row.link}|${x.row.gap}`">
            <button
              type="button"
              class="group -mx-2 flex w-full items-baseline gap-3 rounded-md px-2 py-1 text-left text-[13px] leading-5 text-secondary-foreground hover:bg-surface-2 hover:text-brand-deep"
              @click="fix(x.row)"
            >
              <span class="flex-1">
                <template v-if="x.row.link">Moving on: </template>{{ x.row.link ? x.row.gap.charAt(0).toLowerCase() + x.row.gap.slice(1) : cap(x.row.gap) }}
                <span v-if="x.n > 1" class="text-muted-foreground">· {{ x.n }} times</span>
              </span>
              <span class="text-[12px] font-medium text-brand-deep opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">Fix →</span>
            </button>
          </li>
        </ul>
      </div>
      <p v-if="ready.length" class="flex items-center gap-1.5 border-t border-border pt-4 text-[13px] text-muted-foreground">
        <AIcon name="check" cls="h-3.5 w-3.5 text-success" />{{ readyNames }} {{ ready.length === 1 ? 'is' : 'are' }} ready.
      </p>
    </div>
  </section>
</template>
