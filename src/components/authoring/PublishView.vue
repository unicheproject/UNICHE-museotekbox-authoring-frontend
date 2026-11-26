<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  assignProjectToBox,
  boxOnline,
  describeError,
  errorCode,
  errorDetails,
  listBoxProjects,
  publishExperience,
  unassignProjectFromBox,
  type BoxDto,
  type ProjectDto,
} from '@/api/museotekBox'
import { validate, type Authoring, type FixRow } from '@/lib/authoring/engine'
import { hasNewVersion, publishFailure } from '@/lib/publish'
import { fetchShared, invalidate, keys, storePublishStatus, useShared } from '@/lib/queries'
import { fetchQuery } from '@/lib/useQuery'
import { canManageOrg } from '@/platform/authz'
import { useAuthzStore } from '@/stores/authz'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import AIcon from './AIcon.vue'
import QCard from './ui/QCard.vue'
import { btnGrad, btnOutline } from './ui/styles'

/**
 * Publishing: the checks that must pass first, the published version, the Boxes it goes to, and
 * the one Publish button. Publish first makes a new version of what is saved (when there is
 * something new), then installs the experience on the Boxes ticked and takes it off the ones
 * unticked. Boxes always play the latest published version.
 */
const props = defineProps<{
  a: Authoring
  project: ProjectDto
  /** The last save failed: what the Box would get is not what is on the page. */
  saveError?: string | null
  /** A change is still being saved. */
  pending?: boolean
  /** What is still missing, step by step; each has its "Fix it". */
  fixes: FixRow[]
  base: string
}>()
const emit = defineEmits<{ back: []; fix: [row: FixRow] }>()

interface BoxRow {
  box: BoxDto
  /** Names of the experiences installed on it, this one included. */
  installed: string[]
  /** Whether this experience is on it now. */
  has: boolean
  /** Why the last attempt to change it failed. */
  failed: string | null
}

const authz = useAuthzStore()
const status = useShared('publishStatus', () => props.project.id, { staleMs: 0 })

const loading = ref(true)
const error = ref<string | null>(null)
/** The gaps the backend found when asked to publish (422 EXPERIENCE_NOT_READY). */
const serverGaps = ref<string[]>([])
const rows = ref<BoxRow[]>([])
const owned = ref<Map<string, number> | undefined>(undefined)
const chosen = reactive(new Set<number>())
const publishing = ref(false)
const done = ref<{ version: number | null; boxes: BoxRow[] } | null>(null)

const manager = computed(() => canManageOrg(authz.context, props.project.orgId))
const statusKnown = computed(() => status.data.value !== undefined)
const checks = computed(() => validate(props.a, owned.value))
const blocked = computed(() => checks.value.some((c) => !c.ok))
const changed = computed(() => rows.value.some((r) => r.has !== chosen.has(r.box.id)))
const adding = computed(() => rows.value.some((r) => !r.has && chosen.has(r.box.id)))
/**
 * A new version is made when there is one to make — except when the only thing asked is to take it
 * off Boxes (nothing ticked, something unticked): that needs no new version.
 */
const willPublish = computed(() => hasNewVersion(status.data.value) && (chosen.size > 0 || !changed.value))
/** The checks guard what reaches a Box: a new version, or a Box newly ticked. */
const needsChecks = computed(() => willPublish.value || adding.value)
// Publishing takes what is saved, so it waits for the last change to be saved.
const ready = computed(
  () =>
    manager.value &&
    statusKnown.value &&
    (willPublish.value || changed.value) &&
    !publishing.value &&
    !props.pending &&
    !props.saveError &&
    !(blocked.value && needsChecks.value),
)
/** What to finish first: each missing thing with its way there, else the checks that failed. */
// The same gap on several items (six slides with nothing to show) is one line with a count.
const todo = computed(() => {
  if (!props.fixes.length) return checks.value.filter((c) => !c.ok).map((c) => ({ text: c.text, row: null as FixRow | null, times: 1 }))
  const out: { text: string; row: FixRow | null; times: number }[] = []
  for (const r of props.fixes) {
    const text = `${r.where}: ${r.gap.charAt(0).toLowerCase()}${r.gap.slice(1)}`
    const same = out.find((x) => x.text === text)
    if (same) same.times++
    else out.push({ text, row: r, times: 1 })
  }
  return out
})
const todoCount = computed(() => todo.value.reduce((n, x) => n + x.times, 0))
const failedRows = computed(() => rows.value.filter((r) => r.failed))

function when(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

onMounted(async () => {
  void authz.load()
  try {
    const orgId = props.project.orgId
    // Read fresh — what is installed decides what Publish changes — but into the shared cache, so
    // the experiences list and the Boxes screens reuse it.
    const [boxes, objects] = await Promise.all([
      fetchShared('boxes', orgId, { staleMs: 0 }),
      fetchShared('scanObjects', orgId),
    ])
    const counts = new Map<string, number>()
    for (const o of objects) if (o.scanObjectTypeId != null) counts.set(String(o.scanObjectTypeId), (counts.get(String(o.scanObjectTypeId)) || 0) + 1)
    owned.value = counts
    rows.value = await Promise.all(
      boxes.map(async (box) => {
        const projects = await fetchQuery(keys.boxProjects(orgId, box.id), () => listBoxProjects(orgId, box.id), { staleMs: 0 })
        const has = projects.some((p) => p.id === props.project.id)
        if (has) chosen.add(box.id)
        return { box, installed: projects.map((p) => p.name), has, failed: null }
      }),
    )
  } catch (e) {
    error.value = describeError(e)
  } finally {
    loading.value = false
  }
})

function toggle(id: number, on: boolean) {
  if (on) chosen.add(id)
  else chosen.delete(id)
}

async function publish() {
  publishing.value = true
  error.value = null
  serverGaps.value = []
  for (const r of rows.value) r.failed = null
  const { orgId, id } = props.project
  try {
    // 1. A new version of what is saved. If this fails, no Box is touched.
    let version: number | null = null
    if (willPublish.value) {
      try {
        const published = await publishExperience(id)
        storePublishStatus(id, published)
        version = published.version
      } catch (e) {
        if (errorCode(e) === 'EXPERIENCE_NOT_READY') serverGaps.value = errorDetails(e).length ? errorDetails(e) : [describeError(e)]
        else error.value = publishFailure(e)
        return
      }
    }

    // 2. The Boxes, one by one. The backend changes each separately, so one failing does not stop
    // the rest; each row says how it went.
    let touched = false
    for (const r of rows.value) {
      const want = chosen.has(r.box.id)
      if (want === r.has) continue
      touched = true
      try {
        if (want) await assignProjectToBox(orgId, r.box.id, id)
        else await unassignProjectFromBox(orgId, r.box.id, id)
        r.has = want
      } catch (e) {
        r.failed = publishFailure(e, r.box.name)
      }
    }
    if (touched) invalidate.installed()

    if (failedRows.value.length) return
    done.value = { version, boxes: rows.value.filter((r) => r.has) }
  } finally {
    publishing.value = false
  }
}
</script>

<template>
  <!-- Out: what was published and where it is now. -->
  <div v-if="done" class="mx-auto max-w-2xl">
    <div class="rounded-lg border border-border bg-white p-8 text-center shadow-xs">
      <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-pill bg-success/10 text-success">
        <AIcon name="check" cls="h-7 w-7" />
      </span>
      <h1 class="mt-4 text-2xl font-extrabold tracking-tight">
        <template v-if="done.version">Version {{ done.version }} published</template>
        <template v-else-if="done.boxes.length">Boxes updated</template>
        <template v-else>Taken off every Box</template>
      </h1>
      <p class="mt-2 text-[13.5px] text-muted-foreground">
        {{ a.details.name }} · on {{ done.boxes.length }} box{{ done.boxes.length === 1 ? '' : 'es' }}
      </p>
      <div class="mt-6 space-y-2 text-left">
        <div v-for="r in done.boxes" :key="r.box.id" class="flex items-center gap-3 rounded-md border border-border p-3">
          <span class="flex h-8 w-8 items-center justify-center rounded-sm bg-surface-2 text-muted-foreground"><AIcon name="blank" cls="h-4 w-4" /></span>
          <span class="min-w-0 flex-1">
            <span class="block text-[13px] font-bold">{{ r.box.name }}</span>
            <span class="block font-mono text-[11px] text-muted-foreground">{{ r.box.serialNumber }}</span>
          </span>
          <span class="shrink-0 rounded-pill bg-success/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-overline text-success">Installed</span>
        </div>
      </div>
      <div class="mt-6 flex justify-center gap-2">
        <button type="button" :class="btnOutline" @click="emit('back')">Back to editing</button>
      </div>
    </div>
  </div>

  <div v-else>
    <h2 class="mb-5 text-xl font-extrabold tracking-tight">Publish</h2>

    <Alert v-if="error" variant="error" class="mb-4">{{ error }}</Alert>
    <Alert v-if="saveError" variant="error" class="mb-4" title="The last change was not saved">{{ saveError }}</Alert>
    <Alert v-if="serverGaps.length" variant="error" class="mb-4" title="The server found things still missing:">
      <ul class="mt-1 list-disc space-y-0.5 pl-5">
        <li v-for="(g, i) in serverGaps" :key="i">{{ g }}</li>
      </ul>
    </Alert>
    <Alert v-if="failedRows.length" variant="error" class="mb-4" title="Some Boxes were not updated">
      The others were. Each Box below says what went wrong.
    </Alert>

    <div class="space-y-5">
      <QCard :n="1" :title="todo.length ? 'Finish these first' : 'Everything is ready'" :miss="!!todo.length">
        <ul v-if="todo.length" class="space-y-2">
          <li v-for="(x, i) in todo" :key="i">
            <component
              :is="x.row ? 'button' : 'div'"
              type="button"
              class="flex w-full items-center gap-3 rounded-md border border-warning/20 bg-warning/[.04] px-4 py-3.5 text-left"
              :class="x.row ? 'hover:border-warning' : ''"
              @click="x.row && emit('fix', x.row)"
            >
              <span class="text-warning"><AIcon name="alert" cls="h-5 w-5" /></span>
              <span class="flex-1 text-[14px] font-semibold">{{ x.text }}<span v-if="x.times > 1" class="font-normal text-secondary-foreground"> ({{ x.times }} times)</span></span>
              <span v-if="x.row" class="text-[13.5px] font-bold text-brand-deep">Fix it</span>
            </component>
          </li>
        </ul>
        <div v-else class="flex items-center gap-3 text-[14px] font-bold text-success"><AIcon name="checkc" cls="h-6 w-6" />Nothing is missing</div>
      </QCard>

      <QCard :n="2" title="Published version">
        <Skeleton v-if="status.pending.value" class="h-6 w-64" />
        <p v-else-if="status.error.value" class="text-[13.5px] text-destructive">{{ status.error.value }}</p>
        <template v-else>
          <p v-if="status.data.value === null" class="text-[14px] font-semibold text-secondary-foreground">Not published yet</p>
          <p v-else-if="status.data.value" class="text-[14px] font-semibold">
            Version {{ status.data.value.version }} · published {{ when(status.data.value.publishedAt) }}
            <span v-if="status.data.value.hasUnpublishedChanges" class="mt-0.5 block font-normal text-warning">
              There are changes since then. Publish makes version {{ status.data.value.version + 1 }}.
            </span>
          </p>
          <Alert v-for="(w, i) in status.data.value?.warnings ?? []" :key="i" variant="warning" class="mt-3">{{ w }}</Alert>
        </template>
      </QCard>

      <QCard :n="3" title="Which Boxes should play it?" :miss="!loading && !chosen.size">
        <div v-if="loading" class="space-y-2.5">
          <Skeleton class="h-16 w-full" />
          <Skeleton class="h-16 w-full" />
        </div>
        <div v-else class="space-y-2.5">
          <div v-for="r in rows" :key="r.box.id">
            <label
              class="flex cursor-pointer items-center gap-4 rounded-md border px-4 py-4"
              :class="r.failed ? 'border-destructive' : chosen.has(r.box.id) ? 'border-brand-deep bg-brand-deep/[.04]' : 'border-border'"
            >
              <input
                type="checkbox"
                :checked="chosen.has(r.box.id)"
                :disabled="!manager"
                class="h-6 w-6 accent-[#4c1d8b] disabled:opacity-40"
                @change="toggle(r.box.id, ($event.target as HTMLInputElement).checked)"
              />
              <AIcon name="pkg" cls="h-6 w-6 text-brand-deep" />
              <span class="min-w-0 flex-1">
                <span class="block text-[14px] font-bold">{{ r.box.name }}</span>
                <span v-if="r.installed.length" class="block text-[12.5px] text-muted-foreground">
                  {{ r.installed.length }} experience{{ r.installed.length === 1 ? '' : 's' }} installed
                </span>
              </span>
              <!-- The backend does not report Box status yet: only a reported ONLINE is shown as such. -->
              <span class="inline-flex items-center gap-2 text-[13px] font-semibold" :class="boxOnline(r.box.status) ? 'text-success' : 'text-muted-foreground'">
                <span class="h-2.5 w-2.5 rounded-full" :class="boxOnline(r.box.status) ? 'bg-success' : 'bg-muted-foreground/50'" />
                {{ boxOnline(r.box.status) ? 'Online' : 'Status not reported' }}
              </span>
            </label>
            <p v-if="r.failed" class="mt-1.5 px-1 text-[13px] text-destructive">{{ r.failed }}</p>
          </div>
          <p v-if="!rows.length" class="text-[13.5px] text-muted-foreground">
            No Boxes yet.<template v-if="manager"> Add a Box, then come back to choose it.
              <RouterLink to="/boxes" class="font-bold text-brand-deep hover:underline">Add a Box</RouterLink></template>
          </p>
        </div>
      </QCard>
    </div>

    <div class="mt-8 flex flex-wrap items-center justify-end gap-4 border-t border-border pb-12 pt-6">
      <span v-if="!ready && !publishing" class="text-[13.5px] font-semibold text-muted-foreground">
        <template v-if="authz.context && !manager">Only an organisation manager can publish</template>
        <template v-else-if="pending">Saving your last change…</template>
        <template v-else-if="saveError">Your last change was not saved</template>
        <template v-else-if="!statusKnown">Checking the published version…</template>
        <template v-else-if="blocked && needsChecks">Finish the {{ todoCount }} thing{{ todoCount === 1 ? '' : 's' }} above first</template>
        <template v-else-if="!willPublish && !changed">Published and already on exactly these Boxes</template>
      </span>
      <button
        type="button"
        :disabled="!ready"
        :class="[btnGrad, '!px-8 !py-4 !text-[13.5px]']"
        @click="publish"
      >
        {{ publishing ? 'Publishing…' : 'Publish' }}
      </button>
    </div>
  </div>
</template>
