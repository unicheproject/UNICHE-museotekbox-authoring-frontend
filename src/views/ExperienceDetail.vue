<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { chip, esc } from '@/lib/authoring/html'
import {
  OUTPUTS,
  addIsland,
  fixRows,
  hasDisplay,
  linkInfo,
  mediaName,
  moveIsland,
  num,
  removeIsland,
  scanType,
  stepGaps,
  template,
} from '@/lib/authoring/engine'
import { useAuthoring } from '@/lib/authoring/useAuthoring'
import { useComments } from '@/lib/authoring/useComments'
import { Alert } from '@/components/ui/alert'
import { ConfirmDialog } from '@/components/ui/dialog'
import { deleteProject, describeError, listBoxProjects, listBoxes } from '@/api/museotekBox'
import { Skeleton } from '@/components/ui/skeleton'
import AIcon from '@/components/authoring/AIcon.vue'
import StepCard from '@/components/authoring/StepCard.vue'
import HandOver from '@/components/authoring/HandOver.vue'
import StepPanel from '@/components/authoring/StepPanel.vue'
import OverviewPanel from '@/components/authoring/OverviewPanel.vue'
import LinkDialog from '@/components/authoring/LinkDialog.vue'
import AddActivityDialog from '@/components/authoring/AddActivityDialog.vue'
import FixesDialog from '@/components/authoring/FixesDialog.vue'
import QuizForm from '@/components/authoring/QuizForm.vue'
import TemplateForm from '@/components/authoring/TemplateForm.vue'
import StartForm from '@/components/authoring/StartForm.vue'
import EndForm from '@/components/authoring/EndForm.vue'
import SettingsDialog from '@/components/authoring/SettingsDialog.vue'
import TestRun from '@/components/authoring/TestRun.vue'
import PublishView from '@/components/authoring/PublishView.vue'
import CommentsDrawer from '@/components/authoring/CommentsDrawer.vue'
import ScenesRules from '@/components/authoring/ScenesRules.vue'
import { btnOutline } from '@/lib/authoring/html'

/**
 * The experience page: the visit as one flow, top to bottom — Start, the activities, End — with
 * the hand-over between every two steps. Clicking a step opens it in a panel beside the flow; the
 * small things (how the visitor moves on, adding an activity, what is left to fix) open in a dialog.
 *
 * Every screen has an address, so an experience is somewhere you can go back to:
 *   /experiences/<id>              the flow
 *   /experiences/<id>/step/<key>   …one step in the panel ('start', an activity key, 'end')
 *   /experiences/<id>/link/<from>  …the hand-over that leaves a step
 *   /experiences/<id>/add          …the activity picker
 *   /experiences/<id>/test         …the test run, over the page
 *   /experiences/<id>/publish      publishing it, in place of the flow
 *   /experiences/<id>/advanced     its scenes and rules, in place of the flow
 */
const route = useRoute()
const router = useRouter()

const projectId = computed(() => route.params.projectId as string)
const { authoring: a, project, loading, error, saveError, pending, renaming, load, commit, rename } = useAuthoring(projectId)

const base = computed(() => `/experiences/${projectId.value}`)
const isIsland = (k: string) => a.islands.some((x) => x.key === k)
const comments = useComments(projectId)

/** The step in the panel, from the address. */
const sel = computed(() => {
  if (route.name !== 'experience-step') return null
  const k = route.params.key as string
  return k === 'start' || k === 'end' || isIsland(k) ? k : null
})

type Dialog = { kind: 'link'; key: string } | { kind: 'add'; at: number } | { kind: 'fixes' } | { kind: 'settings' }
const dlg = ref<Dialog | null>(null)

function dialogFromRoute() {
  const k = route.params.key as string
  if (route.name === 'experience-link' && (k === 'start' || isIsland(k))) dlg.value = { kind: 'link', key: k }
  else if (route.name === 'experience-add') dlg.value = { kind: 'add', at: a.islands.length }
  else dlg.value = null
}
watch(() => route.fullPath, dialogFromRoute)
watch(sel, (now, was) => now !== was && window.scrollTo(0, 0))

/** Closing a dialog that has its own address goes back to the page under it. */
function closeDialog() {
  if (route.name === 'experience-link' || route.name === 'experience-add') router.push(base.value)
  else dlg.value = null
}

const openStep = (key: string) => router.push(key === sel.value ? base.value : `${base.value}/step/${key}`)
const openLink = (key: string) => (dlg.value = { kind: 'link', key })
const openAdd = (at: number) => (dlg.value = { kind: 'add', at })

function pick(templateId: string, at: number) {
  const isl = addIsland(a, templateId, at)
  commit()
  dlg.value = null
  router.push(`${base.value}/step/${isl.key}`)
}

/** Removing an activity asks first: everything set up in it goes with it. */
const removingKey = ref<string | null>(null)
function remove() {
  const key = removingKey.value
  removingKey.value = null
  if (!key) return
  const was = sel.value === key
  removeIsland(a, key)
  commit()
  if (was) router.push(base.value)
}

function move(key: string, dir: number) {
  moveIsland(a, key, dir)
  commit()
}

// ─── what each step says, in the flow and in the panel

const shownName = (v: string) => esc(mediaName(v))

const startLine = computed(() => {
  const d = a.details
  if (!d.startCard) return '<span class="font-bold text-brand-deep">Choose the object that starts it →</span>'
  const shows = hasDisplay(a)
    ? d.welcomeMedia
      ? ` · shows <b>${shownName(d.welcomeMedia)}</b>`
      : ''
    : d.welcomeAudio
      ? ` · plays <b>${shownName(d.welcomeAudio)}</b>`
      : ''
  return `When ${chip(scanType(a, d.startCard))} is placed${shows}`
})
const endCardLine = computed(() =>
  a.details.goodbye ? `A goodbye for ${num(a.details.endSeconds) || 10} s, then back to idle` : 'Straight back to idle',
)

const then = (key: string) => {
  const l = linkInfo(a, key)
  return `Then, ${l.phrase}, the visitor goes on to <b>${esc(l.target)}</b>.`
}
const begins = (fromKey: string) => `Begins ${linkInfo(a, fromKey).phrase}.`

/** The activity in the panel, with the step whose hand-over leads into it. */
const selIsland = computed(() => {
  const i = a.islands.findIndex((x) => x.key === sel.value)
  if (i < 0) return null
  return { isl: a.islands[i], index: i, t: template(a.islands[i].templateId), prev: i === 0 ? 'start' : a.islands[i - 1].key }
})
const lastKey = computed(() => a.islands.at(-1)?.key ?? 'start')

/** A step open in the panel; on a narrow screen it takes the place of the flow. */
const split = computed(() => !!sel.value)
const fixes = computed(() => fixRows(a))
const output = computed(() => OUTPUTS[a.details.output])

// Deleting the whole experience, after a confirmation.
const deleting = ref(false)
const deleteBusy = ref(false)
const deleteError = ref<string | null>(null)
async function removeExperience() {
  deleteBusy.value = true
  deleteError.value = null
  try {
    await deleteProject(projectId.value)
    deleting.value = false
    router.push('/experiences')
  } catch (e) {
    deleteError.value = describeError(e)
  } finally {
    deleteBusy.value = false
  }
}

/** The comments drawer, showing one step's comments or, with no step, all of them. It follows the step in the panel. */
const drawer = ref(false)
const drawerStep = ref<string | null>(null)
function toggleDrawer() {
  drawer.value = !drawer.value
  drawerStep.value = sel.value
}
function openComments(key: string) {
  drawer.value = true
  drawerStep.value = key
}
watch(sel, (now) => {
  if (drawer.value && drawerStep.value && drawerStep.value !== now) drawerStep.value = now
})

/** Published: it is on at least one of the museum's Boxes. */
const published = ref(false)
async function loadPublished() {
  if (!project.value) return
  const { orgId, id } = project.value
  try {
    const boxes = await listBoxes(orgId)
    const installed = await Promise.all(boxes.map((b) => listBoxProjects(orgId, b.id)))
    published.value = installed.some((ps) => ps.some((p) => p.id === id))
  } catch {
    // Not knowing only means the header says Draft; the Publish page shows the Boxes itself.
  }
}

/** Whether what is on the page has reached the backend. */
const saving = computed(() => pending.value || renaming.value)

/** The test run has its own address, over the page. */
const testing = computed(() => route.name === 'experience-test')
const publishing = computed(() => route.name === 'experience-publish')
const advanced = computed(() => route.name === 'experience-advanced')

function onKey(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  // A confirmation open on top closes itself; nothing under it should close too.
  if (document.querySelector('[role="alertdialog"]')) return
  if (testing.value) router.push(base.value)
  else if (dlg.value) closeDialog()
  else if (drawer.value) drawer.value = false
  else if (sel.value) router.push(base.value)
}

onMounted(async () => {
  window.addEventListener('keydown', onKey)
  await load()
  dialogFromRoute()
  void loadPublished()
})
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div>
    <Alert v-if="error" variant="error" title="Couldn't load this experience">{{ error }}</Alert>

    <div v-else-if="loading" class="space-y-6">
      <div class="space-y-3">
        <Skeleton class="h-4 w-24" />
        <Skeleton class="h-8 w-72" />
        <Skeleton class="h-6 w-56" />
      </div>
      <div class="mx-auto max-w-2xl space-y-4">
        <Skeleton class="h-16 w-full" />
        <Skeleton class="h-20 w-full" />
        <Skeleton class="h-16 w-full" />
      </div>
    </div>

    <PublishView
      v-else-if="publishing && project"
      :a="a"
      :project="project"
      :save-error="saveError"
      :pending="pending"
      @back="router.push(base)"
      @published="(on) => (published = on)"
    />
    <ScenesRules
      v-else-if="advanced"
      :a="a"
      @change="commit"
      @back="router.push(base)"
      @activity="(k) => router.push(`${base}/step/${k}`)"
    />

    <template v-else>
      <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div class="min-w-0">
          <div class="mb-1 flex flex-wrap items-center gap-1.5 text-[13px] font-bold text-muted-foreground">
            <button type="button" class="hover:text-brand-deep" @click="router.push('/experiences')">← Experiences</button>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <h1 class="flex items-center gap-2 text-2xl font-extrabold tracking-tight">{{ a.details.name || 'Untitled experience' }}</h1>
          </div>
          <div class="mt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-pill border border-border bg-white px-3 py-1 text-[12px] font-bold text-secondary-foreground hover:border-brand-deep"
              @click="dlg = { kind: 'fixes' }"
            >
              <template v-if="published"><span class="h-2 w-2 rounded-pill bg-success" /><span class="text-success">Published</span></template>
              <template v-else><span class="h-2 w-2 rounded-pill bg-muted-foreground/50" />Draft</template>
              <span class="text-muted-foreground">·</span>
              <span v-if="fixes.length" class="text-warning">{{ fixes.length }} to fix</span>
              <template v-else>ready to publish</template>
            </button>
            <span class="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
              <AIcon :name="output.icon" cls="h-3.5 w-3.5" />Plays on {{ output.name }}
            </span>
            <span v-if="!saveError" class="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground" aria-live="polite">
              <template v-if="saving">
                <span class="h-3 w-3 animate-spin rounded-pill border-2 border-muted-foreground/40 border-t-muted-foreground" />Saving…
              </template>
              <template v-else><AIcon name="check" cls="h-3.5 w-3.5 text-success" />Saved</template>
            </span>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            :class="[btnOutline, 'flex items-center gap-2', drawer && 'border-brand-deep text-brand-deep']"
            @click="toggleDrawer"
          >
            <AIcon name="chat" /> Comments
            <span v-if="comments.openThreads().length" class="rounded-pill bg-brand-deep px-1.5 py-px text-[10px] text-white">
              {{ comments.openThreads().length }}
            </span>
          </button>
          <button type="button" :class="[btnOutline, 'flex items-center gap-2']" @click="dlg = { kind: 'settings' }">
            <AIcon name="gear" /> Settings
          </button>
          <button type="button" :class="[btnOutline, 'flex items-center gap-2']" @click="router.push(`${base}/test`)">
            <AIcon name="eye" /> Test it
          </button>
          <button
            type="button"
            class="rounded-md bg-grad-brand px-4 py-2.5 text-[12px] font-extrabold uppercase tracking-button text-white shadow-md transition-transform hover:-translate-y-0.5"
            @click="router.push(`${base}/publish`)"
          >
            Publish
          </button>
        </div>
      </div>

      <Alert v-if="saveError" variant="error" class="mb-6" dismissible @dismiss="saveError = null">{{ saveError }}</Alert>

      <div class="grid grid-cols-1 items-start gap-6 pb-10 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div
          class="lg:sticky lg:top-5 lg:block lg:max-h-[calc(100vh-2.5rem)] lg:overflow-y-auto lg:pb-2.5 lg:pl-[3px] lg:pr-1.5 lg:pt-[3px]"
          :class="split && 'hidden'"
        >
          <StepCard
            glyph="bolt"
            title="Start"
            :line="startLine"
            :gaps="stepGaps(a, 'start').length"
            :selected="sel === 'start'"
            :comments="comments.openThreads('start').length"
            @open="openStep('start')"
            @comments="openComments('start')"
          />

          <div v-if="!a.islands.length" class="flex flex-col items-center">
            <div class="mx-auto w-0.5 shrink-0 bg-brand-deep/[.22]" style="height: 16px" />
            <button
              type="button"
              class="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-brand-deep/35 bg-white px-4 py-6 text-[14px] font-extrabold text-brand-deep hover:border-brand-deep hover:bg-brand-deep/[.03]"
              @click="openAdd(0)"
            >
              <AIcon name="plus" cls="h-4 w-4" /> Add the first activity
            </button>
            <div class="mx-auto w-0.5 shrink-0 bg-brand-deep/[.22]" style="height: 16px" />
          </div>
          <template v-else>
            <HandOver
              :short="linkInfo(a, 'start').short"
              :warn="!!linkInfo(a, 'start').warn"
              :last="false"
              @link="openLink('start')"
              @add="openAdd(0)"
            />
            <template v-for="(isl, i) in a.islands" :key="isl.key">
              <StepCard
                :glyph="template(isl.templateId).icon"
                :title="template(isl.templateId).name"
                :line="template(isl.templateId).summary(a, isl.cfg)"
                :gaps="stepGaps(a, isl.key).length"
                :selected="sel === isl.key"
                :comments="comments.openThreads(isl.key).length"
                large
                @open="openStep(isl.key)"
                @comments="openComments(isl.key)"
              />
              <HandOver
                :short="linkInfo(a, isl.key).short"
                :warn="!!linkInfo(a, isl.key).warn"
                :last="i === a.islands.length - 1"
                @link="openLink(isl.key)"
                @add="openAdd(i + 1)"
              />
            </template>
          </template>

          <StepCard
            glyph="flag"
            title="End"
            :line="endCardLine"
            :gaps="stepGaps(a, 'end').length"
            :selected="sel === 'end'"
            :comments="comments.openThreads('end').length"
            @open="openStep('end')"
            @comments="openComments('end')"
          />
        </div>

        <StepPanel
          v-if="sel === 'start'"
          glyph="bolt"
          kicker="Start"
          title="How the visit starts"
          :out-phrase="then('start')"
          :gaps="stepGaps(a, 'start')"
          @close="router.push(base)"
          @link-out="openLink('start')"
        >
          <StartForm :a="a" @change="commit" />
        </StepPanel>

        <StepPanel
          v-else-if="selIsland"
          :key="selIsland.isl.key"
          :glyph="selIsland.t.icon"
          kicker="Activity"
          :title="selIsland.t.name"
          :in-phrase="begins(selIsland.prev)"
          :out-phrase="then(selIsland.isl.key)"
          :gaps="stepGaps(a, selIsland.isl.key)"
          movable
          :first="selIsland.index === 0"
          :last="selIsland.index === a.islands.length - 1"
          @close="router.push(base)"
          @link-in="openLink(selIsland.prev)"
          @link-out="openLink(selIsland.isl.key)"
          @up="move(selIsland.isl.key, -1)"
          @down="move(selIsland.isl.key, 1)"
          @remove="removingKey = selIsland.isl.key"
        >
          <QuizForm
            v-if="selIsland.isl.templateId === 'quiz'"
            :a="a"
            :cfg="selIsland.isl.cfg"
            @change="commit"
            @replies="dlg = { kind: 'settings' }"
          />
          <TemplateForm v-else :a="a" :template-id="selIsland.isl.templateId" :cfg="selIsland.isl.cfg" @change="commit" />
        </StepPanel>

        <StepPanel
          v-else-if="sel === 'end'"
          glyph="flag"
          kicker="End"
          title="How the visit ends"
          :in-phrase="begins(lastKey)"
          :gaps="stepGaps(a, 'end')"
          @close="router.push(base)"
          @link-in="openLink(lastKey)"
        >
          <EndForm :a="a" @change="commit" />
        </StepPanel>

        <OverviewPanel v-else :a="a" :fixes="fixes" @step="openStep" @link="openLink" />
      </div>

      <CommentsDrawer
        v-if="drawer"
        :a="a"
        :comments="comments"
        :step="drawerStep"
        @close="drawer = false"
        @scope="drawerStep = $event"
      />
      <TestRun v-if="testing" :a="a" :comments="comments" @close="router.push(base)" />
      <SettingsDialog
        v-if="dlg?.kind === 'settings'"
        :a="a"
        @close="closeDialog"
        @change="commit"
        @rename="rename"
        @advanced="router.push(`${base}/advanced`)"
        @delete="() => { dlg = null; deleting = true }"
      />
      <ConfirmDialog
        :open="removingKey != null"
        :title="`Remove ${removingKey ? template(a.islands.find((x) => x.key === removingKey)?.templateId ?? '').name : 'this activity'}?`"
        description="Everything set up in this activity goes with it."
        confirm-label="Remove"
        @update:open="(v) => !v && (removingKey = null)"
        @confirm="remove"
      />
      <ConfirmDialog
        v-model:open="deleting"
        :title="`Delete “${a.details.name || 'Untitled experience'}”?`"
        description="Its activities, questions and settings go with it."
        confirm-label="Yes, delete"
        cancel-label="Keep it"
        :busy="deleteBusy"
        :error="deleteError"
        @confirm="removeExperience"
      />
      <LinkDialog v-if="dlg?.kind === 'link'" :a="a" :from-key="dlg.key" @close="closeDialog" @change="commit" />
      <AddActivityDialog
        v-if="dlg?.kind === 'add'"
        :at="dlg.at"
        :count="a.islands.length"
        @close="closeDialog"
        @pick="(id) => dlg?.kind === 'add' && pick(id, dlg.at)"
      />
      <FixesDialog
        v-if="dlg?.kind === 'fixes'"
        :rows="fixes"
        @close="closeDialog"
        @step="(k) => { dlg = null; router.push(`${base}/step/${k}`) }"
        @link="openLink"
      />
    </template>
  </div>
</template>
