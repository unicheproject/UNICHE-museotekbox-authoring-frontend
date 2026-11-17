<script setup lang="ts">
import { computed, onMounted, ref, watch, type Component } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { Briefcase, Check, ChevronRight, Monitor, Package, ScanLine, Sparkles, Upload, X } from 'lucide-vue-next'
import { useShared } from '@/lib/queries'
import { onlyExperiences } from '@/lib/experiences'
import { usePublishStatuses } from '@/lib/usePublishStatuses'
import { getStarted, type StepId } from '@/lib/getStarted'
import { guideDecision, readGuideMark, writeGuideMark, type GuideMark } from '@/lib/guide'
import { headBtnGrad, headBtnOutline, pill, pillTone } from '@/components/experience/styles'
import NewScanObjectDialog from '@/components/scan/NewScanObjectDialog.vue'
import NewBoxDialog from '@/components/inventory/NewBoxDialog.vue'
import CreateExperienceDialog from './CreateExperienceDialog.vue'

/**
 * The Dashboard's "Get started" card for a manager of `orgId`, only for a new organisation (see
 * `lib/guide.ts`: it starts when the organisation is empty). "×" asks first and puts it away for
 * now; while steps are left, a quiet "Show getting started guide" brings it back where it was.
 * "Got it", once all five are done, ends it for good.
 *
 * A row of the five steps by name (done ✓, current, to come); pressing a name shows that step in
 * the card. Under it, the step shown, with one button:
 * - steps 1, 2 and 4 open their usual dialog right here (the same as on their screens); a scan
 *   object or a Box is made without leaving, and the card moves on. A new experience opens in the
 *   editor (an empty one cannot be published), with the guide's bar there;
 * - steps 3 and 5 need their own page, opened with `?guide=` so it shows the guide's bar.
 * `?open=scan|experience|box` on the Dashboard opens that dialog (the bar's "Next" uses it).
 *
 * Emits `visible` (the Dashboard drops its own "New experience" while this shows) and `changed`
 * (something was made here, so the Dashboard counts again).
 */
const props = defineProps<{ orgId: string }>()
const emit = defineEmits<{ visible: [shown: boolean]; changed: [] }>()
const route = useRoute()
const router = useRouter()

const scanObjects = useShared('scanObjects', () => props.orgId)
const cardTypes = useShared('cardTypes', () => props.orgId)
const projects = useShared('projects', () => props.orgId)
const boxes = useShared('boxes', () => props.orgId)
const installed = useShared('installed', () => props.orgId)

const experiences = computed(() => onlyExperiences(projects.data.value ?? []))
const { statuses } = usePublishStatuses(computed(() => experiences.value.map((p) => p.id)))

/** Everything the steps are counted from has loaded once; until then nothing is drawn. */
const ready = computed(
  () => !!scanObjects.data.value && !!cardTypes.data.value && !!projects.data.value && !!boxes.data.value && !!installed.data.value,
)

/** A Box with something on it: where "Open display" leads. */
const busyBoxId = computed(() => {
  const onBox = installed.data.value?.onBox ?? {}
  return (boxes.data.value ?? []).find((b) => (onBox[b.id] ?? 0) > 0)?.id ?? null
})

const state = computed(() =>
  getStarted({
    typedScanObjects: (scanObjects.data.value ?? []).filter((o) => o.scanObjectTypeId !== null).length,
    hasExitType: (cardTypes.data.value ?? []).some((t) => t.exit),
    experiences: experiences.value.length,
    published: experiences.value.filter((p) => !!statuses.value[p.id]).length,
    boxes: boxes.data.value?.length ?? 0,
    boxesWithExperience: busyBoxId.value === null ? 0 : 1,
  }),
)

// ── Whether it shows at all ──
const mark = ref<GuideMark | null>(readGuideMark(props.orgId))
const decided = computed(() => {
  if (!ready.value) return { show: false, start: false, restorable: false }
  const empty = !(scanObjects.data.value?.length || experiences.value.length || boxes.data.value?.length)
  return guideDecision(mark.value, empty, state.value.allDone)
})
watch(decided, (d) => {
  if (!d.start) return
  writeGuideMark(props.orgId, 'started')
  mark.value = 'started'
})
function setMark(m: GuideMark) {
  writeGuideMark(props.orgId, m)
  mark.value = m
}
/** × asks first, and says how to get it back. */
const confirmHide = ref(false)
function hide() {
  confirmHide.value = false
  setMark('hidden')
}
/** "Show getting started guide": back where it was. */
function restore() {
  setMark('started')
}
/** "Got it" after all five: gone for good. */
function finish() {
  setMark('done')
}
const visible = computed(() => decided.value.show)
watch(visible, (v) => emit('visible', v), { immediate: true })

// ── The step shown: the next one, or the one whose name was pressed ──
const SHORT: Record<StepId, string> = { scan: 'Scan objects', experience: 'Experience', publish: 'Publish', box: 'Box', install: 'On the Box' }
const ICON: Record<StepId, Component> = { scan: ScanLine, experience: Briefcase, publish: Upload, box: Package, install: Monitor }
const viewing = ref<StepId | null>(null)
// When a step gets done, the card moves on to the new next one.
watch(() => state.value.next, () => (viewing.value = null))
const shownId = computed<StepId | null>(() => viewing.value ?? state.value.next)
const shown = computed(() => state.value.steps.find((s) => s.id === shownId.value) ?? null)

// ── What the button does ──
const dialog = ref<'scan' | 'experience' | 'box' | null>(null)
const scanOpen = computed({ get: () => dialog.value === 'scan', set: (v) => (dialog.value = v ? 'scan' : null) })
const boxOpen = computed({ get: () => dialog.value === 'box', set: (v) => (dialog.value = v ? 'box' : null) })

const LABEL: Record<StepId, string> = {
  scan: 'Add a scan object',
  experience: 'New experience',
  publish: 'Publish',
  box: 'Add a Box',
  install: 'Open Box',
}
/** Steps 3 and 5 go to their own page, marked as coming from the guide; null = a dialog here. */
const pageOf = computed<Record<StepId, string | null>>(() => {
  const unpublished = experiences.value.find((p) => statuses.value[p.id] === null) ?? experiences.value[0]
  const firstBox = boxes.data.value?.[0]
  return {
    scan: null,
    experience: null,
    box: null,
    publish: unpublished ? `/experiences/${unpublished.id}/publish?guide=3` : '/experiences',
    install: firstBox ? `/boxes/${props.orgId}/${firstBox.id}?guide=5` : null,
  }
})
function act(id: StepId) {
  if (id === 'scan' || id === 'experience' || id === 'box') dialog.value = id
  else if (id === 'install' && !pageOf.value.install) dialog.value = 'box'
}
function onMade() {
  emit('changed')
}

// The guide's bar on another page sends you back with `?open=…` to make the next thing here.
onMounted(() => {
  const open = route.query.open
  if (open === 'scan' || open === 'experience' || open === 'box') {
    dialog.value = open
    void router.replace({ query: {} })
  }
})
</script>

<template>
  <!-- Put away with ×: one quiet line to bring it back, while steps are left. -->
  <button
    v-if="!visible && decided.restorable"
    type="button"
    class="-mt-3 mb-5 inline-flex items-center gap-1.5 text-[13px] font-bold text-brand-deep hover:underline"
    @click="restore"
  >
    <Sparkles class="h-3.5 w-3.5" />Show getting started guide
  </button>

  <section v-if="visible" class="relative mb-5 rounded-lg bg-white px-5 py-4 shadow-xs sm:px-6" aria-labelledby="next-step">
    <button
      type="button"
      class="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-2 hover:text-foreground"
      title="Hide guide"
      aria-label="Hide guide"
      @click="confirmHide = true"
    >
      <X class="h-4 w-4" />
    </button>

    <!--
      The five steps by name; pressing one shows it below (it does not leave the page). Only the
      step shown is coloured (at first the next one); done steps keep their ✓.
    -->
    <ol class="mb-4 mr-8 flex flex-wrap items-center gap-x-0.5 gap-y-1 border-b border-border pb-3 sm:gap-x-1" aria-label="Steps">
      <li v-for="(s, i) in state.steps" :key="s.id" class="flex items-center gap-1">
        <button
          type="button"
          :aria-current="s.id === state.next ? 'step' : undefined"
          :aria-pressed="s.id === shownId"
          class="inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-[13px] hover:bg-surface-2 sm:px-1.5"
          :class="s.id === shownId ? 'font-extrabold text-brand-deep' : s.done ? 'font-semibold text-foreground' : 'font-semibold text-muted-foreground'"
          @click="viewing = s.id === state.next ? null : s.id"
        >
          <span
            class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold"
            :class="s.done ? 'bg-success text-white' : s.id === shownId ? 'bg-brand-deep text-white' : 'bg-surface-2 text-muted-foreground'"
          >
            <Check v-if="s.done" class="h-3 w-3" aria-label="Done" />
            <template v-else>{{ i + 1 }}</template>
          </span>
          <!-- On a phone only the step shown keeps its name, so the row fits. -->
          <span :class="s.id === shownId ? '' : 'hidden sm:inline'">{{ SHORT[s.id] }}</span>
        </button>
        <ChevronRight v-if="i < state.steps.length - 1" class="hidden h-3.5 w-3.5 shrink-0 text-muted-foreground/50 sm:block" aria-hidden="true" />
      </li>
    </ol>

    <div class="flex flex-wrap items-center gap-x-5 gap-y-4">
      <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-deep/[.07] text-brand-deep" aria-hidden="true">
        <component :is="state.allDone && !viewing ? Sparkles : ICON[shown?.id ?? 'install']" class="h-5 w-5" />
      </span>

      <div class="min-w-0 flex-1 basis-60">
        <template v-if="state.allDone && !viewing">
          <h2 id="next-step" class="text-[16px] font-extrabold">You're all set</h2>
          <p class="text-[13.5px] text-muted-foreground">Your Box is ready for visitors.</p>
        </template>
        <template v-else-if="shown">
          <p class="label-overline text-muted-foreground">{{ shown.id === state.next ? 'Next step' : `Step ${state.steps.indexOf(shown) + 1}` }}</p>
          <h2 id="next-step" class="mt-0.5 text-[16px] font-extrabold">{{ shown.title }}</h2>
          <p class="text-[13.5px] text-muted-foreground">{{ shown.text }}</p>
          <p v-if="shown.id === 'scan' && state.showExitTip" class="mt-1 text-[12.5px] text-muted-foreground">
            Tip: also create an Exit type, so visitors can end their visit.
          </p>
        </template>
      </div>

      <div v-if="state.allDone && !viewing" class="flex flex-wrap gap-2">
        <a v-if="busyBoxId !== null" :href="`/display/${orgId}/${busyBoxId}`" target="_blank" rel="noopener" :class="headBtnGrad">Open display</a>
        <button type="button" :class="headBtnOutline" @click="finish">Got it</button>
      </div>
      <span v-else-if="shown?.done" :class="[pill, pillTone.success]"><Check class="h-3.5 w-3.5" />Done</span>
      <template v-else-if="shown">
        <RouterLink v-if="pageOf[shown.id]" :to="pageOf[shown.id]!" :class="headBtnGrad">{{ LABEL[shown.id] }}</RouterLink>
        <button v-else type="button" :class="headBtnGrad" @click="act(shown.id)">{{ LABEL[shown.id] }}</button>
      </template>
    </div>

    <!-- × asks first: the guide can come back, and the user should know where from. -->
    <div
      v-if="confirmHide"
      class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md bg-surface-2 px-4 py-3 text-[13px]"
      role="alertdialog"
      aria-label="Hide the guide?"
    >
      <p class="min-w-0 flex-1 basis-56">
        <span class="font-bold">Hide the guide?</span>
        <span class="text-muted-foreground"> You can bring it back from the Dashboard.</span>
      </p>
      <div class="flex gap-2">
        <button type="button" :class="[headBtnOutline, '!py-1.5']" @click="hide">Hide</button>
        <button type="button" class="px-2 font-bold text-muted-foreground hover:text-foreground" @click="confirmHide = false">Cancel</button>
      </div>
    </div>

    <!-- The same dialogs as on their screens; made here, you stay here and the card moves on. -->
    <NewScanObjectDialog v-model:open="scanOpen" :org-id="orgId" @created="onMade" />
    <NewBoxDialog v-model:open="boxOpen" :org-id="orgId" @created="onMade" />
    <CreateExperienceDialog v-if="dialog === 'experience'" :org-id="orgId" guide @close="dialog = null" />
  </section>
</template>
