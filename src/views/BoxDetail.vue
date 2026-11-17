<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { Briefcase, Monitor, Package, Plus } from 'lucide-vue-next'
import {
  assignProjectToBox,
  boxOnline,
  deleteBox,
  getBox,
  listBoxProjects,
  unassignProjectFromBox,
  updateBox,
  type ProjectDto,
} from '@/api/museotekBox'
import { useMutation, useQuery } from '@/lib/useQuery'
import { keys } from '@/lib/queries'
import { onlyExperiences } from '@/lib/experiences'
import { publishFailure, publishLabel } from '@/lib/publish'
import { useExperienceList } from '@/lib/useExperienceList'
import { usePublishStatuses } from '@/lib/usePublishStatuses'
import { canManageOrg } from '@/platform/authz'
import { useAuthzStore } from '@/stores/authz'
import { boxFormComplete, emptyBoxForm, toBoxRequest } from '@/lib/boxForm'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/dialog'
import { btnOutline, rowRemove } from '@/components/authoring/ui/styles'
import { headBtnGrad, headBtnOutline, pill, pillTone } from '@/components/experience/styles'
import { Card } from '@/components/ui/card'
import MoreSettings from '@/components/authoring/ui/MoreSettings.vue'
import AIcon from '@/components/authoring/AIcon.vue'
import ExperienceCard from '@/components/experience/ExperienceCard.vue'
import ExperienceBadges from '@/components/experience/ExperienceBadges.vue'
import DetailHeader from '@/components/inventory/DetailHeader.vue'
import GuideBar from '@/components/experience/GuideBar.vue'
import { guideStepOf } from '@/lib/guide'
import FormShell from '@/components/inventory/FormShell.vue'
import BoxFormFields from '@/components/inventory/BoxFormFields.vue'

/**
 * One Box: its details, the experiences installed on it (the same cards as the Experiences
 * screen), and — for a manager of the organisation — editing it, adding and removing experiences,
 * and deleting it. A Box plays the latest published version of each, so only a published
 * experience can be added. The backend does not report status or what is running yet, so nothing
 * is polled and "running" shows only if the backend ever fills it in.
 */
const route = useRoute()
const router = useRouter()
const orgId = computed(() => route.params.orgId as string)
const boxId = computed(() => Number(route.params.boxId))

const authz = useAuthzStore()
void authz.load()
const canManage = computed(() => canManageOrg(authz.context, orgId.value))
/** Reached from the Dashboard's guide (`?guide=5`): its bar on top, done once something is on this Box. */
const fromGuide = computed(() => guideStepOf(route.query) === 5)

const displayHref = computed(() => router.resolve({ name: 'display', params: { orgId: orgId.value, boxId: boxId.value } }).href)

const { data: box, pending, error } = useQuery(
  () => ['box', orgId.value, boxId.value],
  () => getBox(orgId.value, boxId.value),
)

// What is on this Box, under the key the Publish page and the experiences list share.
const onBox = useQuery(
  () => keys.boxProjects(orgId.value, boxId.value),
  () => listBoxProjects(orgId.value, boxId.value),
)
const installed = computed<ProjectDto[]>(() =>
  onlyExperiences(onBox.data.value ?? []).sort((a, b) => a.name.localeCompare(b.name)),
)
const installedIds = computed(() => new Set(installed.value.map((p) => p.id)))

// The organisation's experiences: their card facts, and what could be added.
const { experiences, factsOf } = useExperienceList(computed(() => [orgId.value]))
const candidates = computed(() =>
  experiences.value.filter((p) => !installedIds.value.has(p.id)).sort((a, b) => a.name.localeCompare(b.name)),
)

const addOpen = ref(false)
// Publish status for the cards shown, and for the candidates while the Add dialog is open.
const { statuses } = usePublishStatuses(
  computed(() => [...installed.value.map((p) => p.id), ...(addOpen.value ? candidates.value.map((p) => p.id) : [])]),
)

const running = computed(() =>
  box.value?.currentProjectId ? (experiences.value.find((p) => p.id === box.value!.currentProjectId)?.name ?? box.value.currentProjectId) : null,
)

const saved = ref<string | null>(null)

/** The small uppercase label of a fact, and the heading row of a section (as on a scan object's page). */
const dt = 'text-xs font-bold uppercase tracking-overline text-muted-foreground'
const sectionHead = 'border-b border-border px-5 py-4 text-[15px] font-extrabold sm:px-6'
/**
 * The experience cards on the capped page: the Experiences grid's cards and gap, with columns by the
 * room the page has (cardGrid counts the window and would put four narrow cards here at 1920).
 */
const boxGrid = 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3'
const describe = (e: unknown) => publishFailure(e, box.value?.name)
const onBoxChanged = ['installed', 'box-projects']

// ── Edit ──
const editOpen = ref(false)
const form = ref(emptyBoxForm())
const update = useMutation(updateBox, { invalidates: ['box', 'boxes'] })
function startEdit() {
  if (!box.value) return
  form.value = { name: box.value.name ?? '', serialNumber: box.value.serialNumber ?? '' }
  update.reset()
  editOpen.value = true
}
async function submitEdit() {
  const outcome = await update.mutate(orgId.value, boxId.value, toBoxRequest(form.value))
  if (outcome.ok) {
    editOpen.value = false
    saved.value = 'Changes saved.'
  }
}

// ── Add an experience ──
const chosen = ref<string | null>(null)
const assign = useMutation(assignProjectToBox, { invalidates: onBoxChanged, describe })
function startAdd() {
  chosen.value = null
  assign.reset()
  addOpen.value = true
}
/** A Box plays the latest published version, so an experience never published cannot go on one. */
const publishedOf = (id: string) => statuses.value[id] !== undefined && statuses.value[id] !== null
/** The dialog's two groups: what can go on (or is still being checked), and what was never published. */
const addable = computed(() => candidates.value.filter((p) => statuses.value[p.id] !== null))
const drafts = computed(() => candidates.value.filter((p) => statuses.value[p.id] === null))
async function submitAdd() {
  if (!chosen.value) return
  const name = candidates.value.find((p) => p.id === chosen.value)?.name
  const outcome = await assign.mutate(orgId.value, boxId.value, chosen.value)
  if (outcome.ok) {
    addOpen.value = false
    saved.value = `“${name}” is now on this Box.`
  }
}

// ── Remove an experience ──
const removing = ref<ProjectDto | null>(null)
const unassign = useMutation(unassignProjectFromBox, { invalidates: onBoxChanged, describe })
const removeOpen = computed({
  get: () => removing.value !== null,
  set: (v) => {
    if (!v) removing.value = null
  },
})
function startRemove(p: ProjectDto) {
  removing.value = p
  unassign.reset()
}
async function confirmRemove() {
  if (!removing.value) return
  const name = removing.value.name
  const outcome = await unassign.mutate(orgId.value, boxId.value, removing.value.id)
  if (outcome.ok) {
    removing.value = null
    saved.value = `“${name}” was taken off this Box.`
  }
}

// ── Delete the Box ──
const deleteOpen = ref(false)
const remove = useMutation(deleteBox, { invalidates: ['box', 'boxes', 'installed'] })
async function confirmDelete() {
  const outcome = await remove.mutate(orgId.value, boxId.value)
  if (outcome.ok) router.push('/boxes')
}
</script>

<template>
  <div>
    <Alert v-if="error" variant="error" title="Couldn't load this Box">{{ error }}</Alert>

    <div v-else-if="pending" class="max-w-5xl space-y-4">
      <div class="rounded-lg bg-white px-5 py-5 shadow-xs sm:px-6">
        <Skeleton class="h-4 w-40" />
        <Skeleton class="mt-3 h-7 w-64" />
      </div>
      <Skeleton class="h-32 w-full" />
    </div>

    <!-- Capped like a scan object's page, so the few facts of a Box do not stretch across a wide screen. -->
    <div v-else-if="box" class="max-w-5xl">
      <GuideBar
        v-if="fromGuide"
        :step="5"
        title="Put the experience on the Box"
        :done="installed.length > 0"
        next-label="Open display"
        :next-href="displayHref"
      />
      <DetailHeader crumb="Boxes" crumb-to="/boxes" :title="box.name">
        <template #lead>
          <span class="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-brand-deep/[.06]" aria-hidden="true">
            <Package class="h-6 w-6 text-brand-deep" />
          </span>
        </template>
        <template #pills>
          <span class="text-[13px] text-muted-foreground">Serial <span class="font-mono">{{ box.serialNumber || '—' }}</span></span>
          <span v-if="boxOnline(box.status)" :class="[pill, pillTone.success]"><span class="h-1.5 w-1.5 rounded-full bg-success" />Online</span>
          <span v-else :class="[pill, pillTone.neutral]">Status not reported</span>
        </template>
        <template #actions>
          <!-- The Box's display, in a new tab to drag to the TV. Anyone who sees the Box: manager, admin, curator.
               The page's main action, so it carries the gradient; Edit, used rarely, stays outlined. -->
          <a :href="displayHref" target="_blank" rel="noopener" :class="headBtnGrad"><Monitor class="h-3.5 w-3.5" />Open display</a>
          <button v-if="canManage" type="button" :class="headBtnOutline" @click="startEdit">Edit</button>
          <span v-else :class="[pill, pillTone.neutral]">View only</span>
        </template>
      </DetailHeader>

      <div class="space-y-5">
        <Alert v-if="saved" variant="success" dismissible @dismiss="saved = null">{{ saved }}</Alert>

        <!-- The serial is in the header; this card appears only when the backend says what is playing. -->
        <section v-if="running" class="rounded-lg bg-white shadow-xs" aria-labelledby="box-details">
          <h2 id="box-details" :class="sectionHead">Details</h2>
          <dl class="grid gap-x-6 gap-y-5 px-5 py-5 text-[14px] sm:grid-cols-2 sm:px-6">
            <div>
              <dt :class="dt">Playing now</dt>
              <dd class="mt-1">
                <RouterLink :to="`/experiences/${box.currentProjectId}`" class="font-semibold text-brand-deep hover:underline">{{ running }}</RouterLink>
              </dd>
            </div>
          </dl>
        </section>

        <!-- Laid out like the Dashboard's "Recently edited": a small label, then the same cards on the page. -->
        <section aria-labelledby="box-experiences">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 id="box-experiences" class="label-overline text-muted-foreground">
              Experiences on this Box<template v-if="onBox.data.value"> · {{ installed.length }}</template>
            </h2>
            <!-- When the list is empty the button sits in the empty card instead, next to what to do. -->
            <button v-if="canManage && installed.length" type="button" :class="headBtnOutline" @click="startAdd"><Plus class="h-3.5 w-3.5" />Add experience</button>
          </div>
          <p class="mb-3 mt-1 text-[13px] text-muted-foreground">The Box plays the latest published version of each.</p>

          <Alert v-if="onBox.error.value" variant="error" title="Couldn't load the experiences on this Box">
            {{ onBox.error.value }}
            <button type="button" :class="[headBtnOutline, 'mt-3']" @click="onBox.refresh()">Try again</button>
          </Alert>
          <div v-else-if="onBox.pending.value" :class="boxGrid">
            <Skeleton v-for="n in 2" :key="n" class="h-56 w-full" />
          </div>
          <!-- Compact: one row with the EmptyState's glyph, what to do, and the button. -->
          <Card v-else-if="!installed.length" class="flex flex-wrap items-center gap-4 px-5 py-5 sm:px-6">
            <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-deep/[.07] text-brand-deep" aria-hidden="true">
              <Briefcase class="h-5 w-5" />
            </span>
            <div class="min-w-0 flex-1 basis-48">
              <p class="text-sm font-bold">No experiences on this Box yet</p>
              <p class="mt-0.5 text-[13px] text-muted-foreground">
                {{ canManage ? 'The Box plays the experiences you add here. Publish one first, then add it.' : 'Your organisation manager adds experiences to Boxes.' }}
              </p>
            </div>
            <button v-if="canManage" type="button" :class="headBtnOutline" @click="startAdd"><Plus class="h-3.5 w-3.5" />Add experience</button>
          </Card>
          <div v-else :class="boxGrid">
            <div v-for="p in installed" :key="p.id" class="flex flex-col gap-1.5">
              <ExperienceCard class="flex-1" :project="p" v-bind="factsOf(p)" :publish="publishLabel(statuses[p.id])" />
              <button
                v-if="canManage"
                type="button"
                :class="[rowRemove, 'self-end !text-secondary-foreground hover:!text-destructive']"
                @click="startRemove(p)"
              >
                Remove from this Box
              </button>
            </div>
          </div>
        </section>

        <MoreSettings v-if="canManage">
          <button
            type="button"
            :class="[btnOutline, '!py-2.5 !text-[13px] hover:!border-destructive hover:!text-destructive']"
            @click="deleteOpen = true"
          >
            <AIcon name="trash" />Delete this Box
          </button>
        </MoreSettings>
      </div>
    </div>

    <FormShell
      v-if="canManage"
      v-model:open="editOpen"
      title="Edit Box"
      submit-label="Save changes"
      :busy="update.loading.value"
      :error="update.error.value"
      :submit-disabled="!boxFormComplete(form)"
      @submit="submitEdit"
    >
      <BoxFormFields v-model="form" :field-errors="update.fieldErrors.value" />
    </FormShell>

    <FormShell
      v-if="canManage"
      v-model:open="addOpen"
      title="Add an experience to this Box"
      sub="Only a published experience can go on a Box: it plays the latest published version."
      submit-label="Add to Box"
      :busy="assign.loading.value"
      :error="assign.error.value"
      :submit-disabled="!chosen || !publishedOf(chosen)"
      @submit="submitAdd"
    >
      <p v-if="!candidates.length" class="text-[14px] text-muted-foreground">Every experience of this organisation is already on this Box.</p>
      <template v-else>
        <!-- Published (or still being checked) first, as the choices of New experience: pick one, it gets the brand border and a tick. -->
        <div v-if="addable.length" class="grid gap-2.5">
          <button
            v-for="p in addable"
            :key="p.id"
            type="button"
            :aria-pressed="chosen === p.id"
            :disabled="!publishedOf(p.id)"
            class="flex items-center gap-3.5 rounded-lg border p-3.5 text-left transition-colors disabled:cursor-wait"
            :class="chosen === p.id ? 'border-brand-deep bg-brand-deep/[.05]' : 'border-border hover:border-brand-deep/50'"
            @click="chosen = p.id"
          >
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-deep/[.06] text-brand-deep" aria-hidden="true">
              <Briefcase class="h-5 w-5" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="line-clamp-2 break-words text-[14px] font-extrabold" :class="{ 'text-brand-deep': chosen === p.id }">{{ p.name }}</span>
              <span v-if="statuses[p.id] === undefined" class="text-[12.5px] text-muted-foreground">Checking…</span>
            </span>
            <ExperienceBadges v-if="statuses[p.id]" :publish="publishLabel(statuses[p.id])" />
            <span v-if="chosen === p.id" class="shrink-0 text-brand-deep"><AIcon name="check" cls="h-5 w-5" /></span>
          </button>
        </div>

        <!-- Never published: listed once under one explanation, each with the way to publish it. -->
        <div v-if="drafts.length" :class="{ 'mt-6': addable.length }">
          <p class="label-overline text-muted-foreground">Not published yet</p>
          <p class="mt-1 text-[13px] text-muted-foreground">Publish an experience before it can go on a Box.</p>
          <ul class="mt-3 divide-y divide-border rounded-lg border border-border">
            <li v-for="p in drafts" :key="p.id" class="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3.5 py-3">
              <span class="line-clamp-2 min-w-0 flex-1 basis-40 break-words text-[14px] font-bold text-secondary-foreground">{{ p.name }}</span>
              <ExperienceBadges :publish="publishLabel(statuses[p.id])" />
              <RouterLink :to="`/experiences/${p.id}/publish`" class="text-[13px] font-bold text-brand-deep hover:underline">Publish it</RouterLink>
            </li>
          </ul>
        </div>
      </template>
    </FormShell>

    <ConfirmDialog
      v-model:open="removeOpen"
      :title="`Take “${removing?.name ?? ''}” off this Box?`"
      description="The experience itself is not changed, and you can add it again later."
      confirm-label="Remove"
      :busy="unassign.loading.value"
      :error="unassign.error.value"
      @confirm="confirmRemove"
    />

    <ConfirmDialog
      v-model:open="deleteOpen"
      title="Delete this Box?"
      :description="
        installed.length
          ? `${installed.length} experience${installed.length === 1 ? ' is' : 's are'} installed on it and will be taken off. The experiences themselves are not changed. This cannot be undone here.`
          : 'It will be removed from the organisation. This cannot be undone here.'
      "
      :busy="remove.loading.value"
      :error="remove.error.value"
      @confirm="confirmDelete"
    />
  </div>
</template>
