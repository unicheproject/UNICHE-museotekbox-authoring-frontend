<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { addIsland, fixRows, moveIsland, removeIsland, template, type FixRow } from '@/lib/authoring/engine'
import { useAuthoring } from '@/lib/authoring/useAuthoring'
import { useComments } from '@/lib/authoring/useComments'
import { Alert } from '@/components/ui/alert'
import { ConfirmDialog } from '@/components/ui/dialog'
import { deleteProject, describeError } from '@/api/museotekBox'
import { fetchShared, invalidate } from '@/lib/queries'
import { Skeleton } from '@/components/ui/skeleton'
import AddActivityDialog from '@/components/authoring/AddActivityDialog.vue'
import StepFrame from '@/components/authoring/StepFrame.vue'
import ExperienceHeader from '@/components/authoring/ExperienceHeader.vue'
import VisitPath from '@/components/authoring/ui/VisitPath.vue'
import VisitPage from '@/components/authoring/VisitPage.vue'
import QuizForm from '@/components/authoring/QuizForm.vue'
import QuestionPage from '@/components/authoring/QuestionPage.vue'
import TemplateForm from '@/components/authoring/TemplateForm.vue'
import StartForm from '@/components/authoring/StartForm.vue'
import EndForm from '@/components/authoring/EndForm.vue'
import SettingsPage from '@/components/authoring/SettingsPage.vue'
import CommentsPage from '@/components/authoring/CommentsPage.vue'
import TestRun from '@/components/authoring/TestRun.vue'
import PublishView from '@/components/authoring/PublishView.vue'
import ScenesRules from '@/components/authoring/ScenesRules.vue'

/**
 * The experience page: the visit as one numbered list, top to bottom — Start, the activities, End —
 * with the hand-over between every two steps. Every step, the settings and the comments open on a
 * page of their own; a question or slide of a quiz opens in a panel over the quiz, and adding an
 * activity opens a dialog.
 *
 * Every screen has an address, so an experience is somewhere you can go back to:
 *   /experiences/<id>                     the visit
 *   /experiences/<id>/step/<key>          one step ('start', an activity key, 'end'); ?f=<field> brings a field into view
 *   /experiences/<id>/step/<key>/q/<n>    one question or slide of a quiz
 *   /experiences/<id>/link/<from>         the step whose hand-over is being changed, at that card
 *   /experiences/<id>/add                 the activity picker, over the visit
 *   /experiences/<id>/settings            the whole experience's settings
 *   /experiences/<id>/comments[/<key>]    every comment, or one step's
 *   /experiences/<id>/test                the test run, over the page
 *   /experiences/<id>/publish             publishing it
 *   /experiences/<id>/advanced            its scenes and rules
 */
const route = useRoute()
const router = useRouter()

const projectId = computed(() => route.params.projectId as string)
const { authoring: a, project, loading, error, saveError, pending, renaming, load, commit, rename } = useAuthoring(projectId)

const base = computed(() => `/experiences/${projectId.value}`)
const isIsland = (k: string) => a.islands.some((x) => x.key === k)
const comments = useComments(projectId)

/** The step on its own page, from the address; the hand-over of a step is changed on that step's page. */
const sel = computed(() => {
  if (route.name !== 'experience-step' && route.name !== 'experience-link' && route.name !== 'experience-question') return null
  const k = route.params.key as string
  return k === 'start' || k === 'end' || isIsland(k) ? k : null
})
/** The question of a quiz on its own page. */
const question = computed(() => {
  if (route.name !== 'experience-question' || !sel.value) return null
  const isl = a.islands.find((x) => x.key === sel.value)
  const n = Number(route.params.n)
  return isl && isl.templateId === 'quiz' && isl.cfg.questions?.[n] ? { isl, n } : null
})

const adding = computed(() => route.name === 'experience-add')
const addAt = ref<number | null>(null)
const testing = computed(() => route.name === 'experience-test')
const publishing = computed(() => route.name === 'experience-publish')
const advanced = computed(() => route.name === 'experience-advanced')
const settings = computed(() => route.name === 'experience-settings')
const commentsPage = computed(() => route.name === 'experience-comments' || route.name === 'experience-comments-step')

/** A field named in the address (?f=next, or the hand-over of /link/) is scrolled to and flashed once the page is drawn. */
async function focusField() {
  const f = route.name === 'experience-link' ? 'next' : (route.query.f as string | undefined)
  if (!f) return
  await nextTick()
  const el = document.getElementById(`f-${f}`)
  if (!el) return
  el.scrollIntoView({ block: 'center' })
  el.classList.remove('flash')
  void el.offsetWidth
  el.classList.add('flash')
}
watch(
  () => route.fullPath,
  async (now, was) => {
    const path = (p: string) => p.split('?')[0]
    // Opening or closing a question's panel keeps the quiz under it where it was.
    const quiz = (p: string) => path(p).replace(/\/q\/\d+$/, '')
    if (!was || quiz(now) !== quiz(was)) window.scrollTo(0, 0)
    await focusField()
  },
)

const openStep = (key: string) => router.push(`${base.value}/step/${key}`)
const openLink = (key: string) => router.push(`${base.value}/step/${key}?f=next`)
function openAdd(at: number) {
  addAt.value = at
  router.push(`${base.value}/add`)
}
function fix(r: FixRow) {
  if (r.link) openLink(r.key)
  else openStep(r.key)
}

function pick(templateId: string) {
  const isl = addIsland(a, templateId, addAt.value ?? a.islands.length)
  addAt.value = null
  commit()
  router.push(`${base.value}/step/${isl.key}`)
}

/** Removing an activity asks first: everything set up in it goes with it. */
const removingKey = ref<string | null>(null)
function remove() {
  const key = removingKey.value
  removingKey.value = null
  if (!key) return
  removeIsland(a, key)
  commit()
  router.push(base.value)
}

function move(key: string, dir: number) {
  moveIsland(a, key, dir)
  commit()
}

/** The activity on its page. */
const selIsland = computed(() => {
  const i = a.islands.findIndex((x) => x.key === sel.value)
  return i < 0 ? null : { isl: a.islands[i], index: i }
})

const title = computed(() => a.details.name || 'Untitled experience')
const fixes = computed(() => fixRows(a))
const openOf = (k?: string) => comments.openThreads(k)

// Deleting the whole experience, after a confirmation.
const deleting = ref(false)
const deleteBusy = ref(false)
const deleteError = ref<string | null>(null)
async function removeExperience() {
  deleteBusy.value = true
  deleteError.value = null
  try {
    await deleteProject(projectId.value)
    invalidate.projects()
    deleting.value = false
    router.push('/experiences')
  } catch (e) {
    deleteError.value = describeError(e)
  } finally {
    deleteBusy.value = false
  }
}

/** Published: it is on at least one of the museum's Boxes. */
const published = ref(false)
async function loadPublished() {
  if (!project.value) return
  const { orgId, id } = project.value
  try {
    published.value = (await fetchShared('installed', orgId)).includes(id)
  } catch {
    // Not knowing only means the header says Draft; the Publish page shows the Boxes itself.
  }
}

/** Whether what is on the page has reached the backend. */
const saving = computed(() => pending.value || renaming.value)

function onKey(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  // A confirmation or a picker open on top closes itself; nothing under it should close too.
  if (document.querySelector('[role="alertdialog"], [role="dialog"]') && !testing.value && !adding.value) return
  if (testing.value || adding.value) router.push(base.value)
}

onMounted(async () => {
  window.addEventListener('keydown', onKey)
  await load()
  void loadPublished()
  await focusField()
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
      <div class="space-y-4">
        <Skeleton class="h-16 w-full" />
        <Skeleton class="h-20 w-full" />
        <Skeleton class="h-16 w-full" />
      </div>
    </div>

    <!--
      One frame for every page of the experience: the header and the row of steps are drawn here,
      once, and only the content under them changes. Every one of these addresses renders this same
      component, so moving between steps patches the content and leaves the frame where it is.
    -->
    <div v-else>
      <div class="mb-6 rounded-lg bg-white px-5 py-5 shadow-xs sm:px-6">
        <ExperienceHeader
          :name="title"
          :base="base"
          :published="published"
          :saving="saving"
          :save-error="!!saveError"
          :comments="openOf().length"
          :active="settings ? 'settings' : commentsPage ? 'comments' : publishing ? 'publish' : null"
          :at-overview="route.name === 'experience' || testing || adding"
          @comments="router.push(`${base}/comments`)"
          @settings="router.push(`${base}/settings`)"
          @test="router.push(`${base}/test`)"
          @publish="router.push(`${base}/publish`)"
        />
        <VisitPath
          class="-mx-5 -mb-5 mt-5 rounded-b-lg border-t border-border bg-surface-2/60 px-5 py-4 sm:-mx-6 sm:px-6"
          :a="a"
          :current="sel"
          :base="base"
          :fixes="fixes"
          :comments="(k) => openOf(k).length"
          @link="openLink"
          @add="openAdd"
        />
      </div>

      <Alert v-if="saveError && !publishing" variant="error" class="mb-6" dismissible @dismiss="saveError = null">{{ saveError }}</Alert>

      <PublishView
        v-if="publishing && project"
        :a="a"
        :project="project"
        :save-error="saveError"
        :pending="pending"
        :fixes="fixes"
        :base="base"
        @back="router.push(base)"
        @fix="fix"
        @published="(on) => (published = on)"
      />
      <ScenesRules
        v-else-if="advanced"
        :a="a"
        @change="commit"
        @back="router.push(base)"
        @activity="(k) => router.push(`${base}/step/${k}`)"
      />
      <SettingsPage
        v-else-if="settings"
        :a="a"
        :base="base"
        @change="commit"
        @rename="rename"
        @advanced="router.push(`${base}/advanced`)"
        @delete="deleting = true"
      />
      <CommentsPage
        v-else-if="commentsPage"
        :a="a"
        :comments="comments"
        :step="(route.params.key as string) || null"
        :base="base"
      />

      <StepFrame
        v-else-if="sel === 'start'"
        :a="a"
        step-key="start"
        :base="base"
        :fixes="fixes"
        :comments="openOf('start')"
        @comments="router.push(`${base}/comments/start`)"
      >
        <StartForm :a="a" @change="commit" />
      </StepFrame>

      <StepFrame
        v-else-if="selIsland"
        :key="selIsland.isl.key"
        :a="a"
        :step-key="selIsland.isl.key"
        :base="base"
        :fixes="fixes"
        movable
        :comments="openOf(selIsland.isl.key)"
        @comments="router.push(`${base}/comments/${selIsland!.isl.key}`)"
        @up="move(selIsland!.isl.key, -1)"
        @down="move(selIsland!.isl.key, 1)"
        @remove="removingKey = selIsland!.isl.key"
      >
        <QuizForm
          v-if="selIsland.isl.templateId === 'quiz'"
          :a="a"
          :cfg="selIsland.isl.cfg"
          :step-key="selIsland.isl.key"
          @change="commit"
          @replies="router.push(`${base}/settings`)"
          @open="(n) => router.push(`${base}/step/${selIsland!.isl.key}/q/${n}`)"
        />
        <TemplateForm
          v-else
          :a="a"
          :template-id="selIsland.isl.templateId"
          :cfg="selIsland.isl.cfg"
          :step-key="selIsland.isl.key"
          @change="commit"
          @advanced="router.push(`${base}/advanced`)"
        />
      </StepFrame>

      <StepFrame
        v-else-if="sel === 'end'"
        :a="a"
        step-key="end"
        :base="base"
        :fixes="fixes"
        :comments="openOf('end')"
        @comments="router.push(`${base}/comments/end`)"
      >
        <EndForm :a="a" @change="commit" />
      </StepFrame>

      <VisitPage
        v-else
        :a="a"
        :published="published"
        :fixes="fixes"
        @step="openStep"
        @link="openLink"
      />

      <!-- A question or slide opens in a panel over its quiz, so the list stays in view. -->
      <QuestionPage
        v-if="question"
        :key="`${question.isl.key}-${question.n}`"
        :a="a"
        :cfg="question.isl.cfg"
        :step-key="question.isl.key"
        :index="question.n"
        :name="title"
        :base="base"
        :saving="saving"
        :fixes="fixes"
        @change="commit"
      />
      <TestRun v-if="testing" :a="a" :comments="comments" @close="router.push(base)" />
      <AddActivityDialog
        v-if="adding"
        :at="addAt ?? a.islands.length"
        :count="a.islands.length"
        @close="router.push(base)"
        @pick="pick"
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
        :title="`Delete “${title}”?`"
        description="Its activities, questions and settings go with it."
        confirm-label="Yes, delete"
        cancel-label="Keep it"
        :busy="deleteBusy"
        :error="deleteError"
        @confirm="removeExperience"
      />
    </div>
  </div>
</template>
