<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { branchLine, isInfo, newInfo, newQuestion, or, questionGaps, type Authoring, type Cfg } from '@/lib/authoring/engine'
import AIcon from './AIcon.vue'
import QuestionEditor from './QuestionEditor.vue'
import SectionHead from './SectionHead.vue'

/**
 * The quiz, item by item: the list on the left, the item being edited on the right. An item is
 * either a question (answered by placing an object) or information shown between questions, which
 * moves on by itself. A new item goes in after the selected one. The two sit side by side only when
 * the panel is wide enough for the editor; otherwise the editor goes under the list.
 */
const props = defineProps<{ a: Authoring; cfg: Cfg }>()
const emit = defineEmits<{ change: [] }>()

const qs = computed<Cfg[]>(() => props.cfg.questions || [])
const numbers = computed(() => {
  let n = 0
  return qs.value.map((q) => (isInfo(q) ? null : ++n))
})

/** The item in the editor; kept inside the list as items come and go. */
const selected = ref(0)
watch(
  () => qs.value.length,
  (n) => (selected.value = Math.min(selected.value, Math.max(n - 1, 0))),
)

/** Side by side needs room for the list (240px) and a comfortable editor beside it. */
const SIDE_BY_SIDE = 900
const root = ref<HTMLElement | null>(null)
const wide = ref(false)
let observer: ResizeObserver | null = null
onMounted(() => {
  observer = new ResizeObserver(([entry]) => (wide.value = entry.contentRect.width >= SIDE_BY_SIDE))
  if (root.value) observer.observe(root.value)
})
onBeforeUnmount(() => observer?.disconnect())

function insert(kind: 'question' | 'info') {
  const at = qs.value.length ? selected.value + 1 : 0
  const item = kind === 'info' ? newInfo(1) : newQuestion(1)
  item.name = ''
  props.cfg.questions.splice(at, 0, item)
  selected.value = at
  emit('change')
}

const addBtn =
  'flex flex-1 items-center justify-center gap-1.5 rounded-md border border-dashed border-input bg-white px-2.5 py-2 text-[12px] font-extrabold text-brand-deep hover:border-brand-deep hover:bg-brand-deep/[.03]'
</script>

<template>
  <SectionHead title="Questions" help="The order of the quiz, from top to bottom. Select an item to set it up." />
  <div ref="root" class="grid items-start gap-4" :class="wide && 'grid-cols-[240px_minmax(0,1fr)]'">
    <div class="space-y-1.5" :class="wide && 'sticky top-5'">
      <button
        v-for="(q, i) in qs"
        :key="i"
        type="button"
        :aria-current="selected === i ? 'true' : undefined"
        class="flex w-full items-center gap-2.5 rounded-md border bg-white px-2.5 py-2 text-left transition-colors"
        :class="selected === i ? 'border-brand-deep shadow-[0_0_0_1px_#4c1d8b]' : 'border-border hover:border-brand-deep'"
        @click="selected = i"
      >
        <span v-if="isInfo(q)" class="flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-surface-2 text-brand-deep">
          <AIcon name="film" cls="h-3.5 w-3.5" />
        </span>
        <span v-else class="flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-brand-deep text-[11.5px] font-extrabold text-white">
          {{ numbers[i] }}
        </span>
        <span class="min-w-0 flex-1">
          <span class="block text-[9.5px] font-extrabold uppercase tracking-overline text-muted-foreground">
            {{ isInfo(q) ? 'Information' : 'Question ' + numbers[i] }}
          </span>
          <span class="block truncate text-[13px] font-bold">{{ or(q.name, isInfo(q) ? 'New information' : 'New question') }}</span>
          <span v-if="branchLine(a, qs, q)" class="mt-0.5 flex items-center gap-1 truncate text-[11.5px] font-bold text-brand-deep">
            <AIcon name="route" cls="h-3.5 w-3.5 shrink-0" />{{ branchLine(a, qs, q) }}
          </span>
        </span>
        <span
          v-if="questionGaps(a, q).length"
          class="shrink-0 rounded-pill bg-warning/10 px-2 py-0.5 text-[10.5px] font-extrabold text-warning"
        >
          {{ questionGaps(a, q).length }} to fix
        </span>
      </button>

      <div class="flex gap-1.5 pt-1">
        <button type="button" :class="addBtn" @click="insert('question')"><AIcon name="plus" cls="h-3.5 w-3.5" /> Question</button>
        <button type="button" :class="addBtn" @click="insert('info')"><AIcon name="plus" cls="h-3.5 w-3.5" /> Information</button>
      </div>
    </div>

    <QuestionEditor
      v-if="qs[selected]"
      :key="selected"
      :a="a"
      :cfg="cfg"
      :index="selected"
      @change="emit('change')"
      @moved="selected = $event"
      @removed="selected = Math.max(0, selected - 1)"
    />
  </div>
</template>
