<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  assignProjectToBox,
  boxOnline,
  describeError,
  listBoxProjects,
  unassignProjectFromBox,
  type BoxDto,
  type ProjectDto,
} from '@/api/museotekBox'
import { validate, type Authoring, type FixRow } from '@/lib/authoring/engine'
import { fetchShared, invalidate, keys } from '@/lib/queries'
import { fetchQuery } from '@/lib/useQuery'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import AIcon from './AIcon.vue'
import Crumbs from './ui/Crumbs.vue'
import QCard from './ui/QCard.vue'
import { btnGrad, btnOutline } from './ui/styles'

/**
 * Publishing: the checks that must pass first, the Boxes it goes to, and a summary
 * with the one Publish button. Publishing installs the experience on the Boxes ticked and takes it
 * off the ones unticked.
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
/** `published`: whether it is on at least one Box now. */
const emit = defineEmits<{ back: []; fix: [row: FixRow]; published: [on: boolean] }>()

interface BoxRow {
  box: BoxDto
  /** Names of the experiences installed on it, this one included. */
  installed: string[]
  /** Whether this experience is on it now. */
  has: boolean
}

const loading = ref(true)
const error = ref<string | null>(null)
const rows = ref<BoxRow[]>([])
const owned = ref<Map<string, number> | undefined>(undefined)
const chosen = reactive(new Set<number>())
const publishing = ref(false)
const done = ref<BoxRow[] | null>(null)

const checks = computed(() => validate(props.a, owned.value))
const blocked = computed(() => checks.value.some((c) => !c.ok))
const changed = computed(() => rows.value.some((r) => r.has !== chosen.has(r.box.id)))
// Publishing installs what is saved, so it waits for the last change to be saved; taking it off
// every box needs no checks.
const ready = computed(
  () => changed.value && !publishing.value && !props.pending && !props.saveError && (!blocked.value || chosen.size === 0),
)
/** What to finish first: each missing thing with its way there, else the checks that failed. */
const todo = computed(() =>
  props.fixes.length
    ? props.fixes.map((r) => ({ text: `${r.where}: ${r.gap.charAt(0).toLowerCase()}${r.gap.slice(1)}`, row: r as FixRow | null }))
    : checks.value.filter((c) => !c.ok).map((c) => ({ text: c.text, row: null as FixRow | null })),
)

onMounted(async () => {
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
        return { box, installed: projects.map((p) => p.name), has }
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
  const { orgId, id } = props.project
  try {
    for (const r of rows.value) {
      const want = chosen.has(r.box.id)
      if (want && !r.has) await assignProjectToBox(orgId, r.box.id, id)
      if (!want && r.has) await unassignProjectFromBox(orgId, r.box.id, id)
      r.has = want
    }
    done.value = rows.value.filter((r) => r.has)
    invalidate.installed()
    emit('published', done.value.length > 0)
  } catch (e) {
    error.value = describeError(e)
  } finally {
    publishing.value = false
  }
}

</script>

<template>
  <!-- Out: where it is now. -->
  <div v-if="done" class="mx-auto max-w-2xl">
    <div class="rounded-lg border border-border bg-white p-8 text-center shadow-xs">
      <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-pill bg-success/10 text-success">
        <AIcon name="check" cls="h-7 w-7" />
      </span>
      <h1 class="mt-4 text-2xl font-extrabold tracking-tight">{{ done.length ? 'It is out' : 'Taken off every box' }}</h1>
      <p class="mt-2 text-[13.5px] text-muted-foreground">
        {{ a.details.name }} · {{ done.length }} box{{ done.length === 1 ? '' : 'es' }}
      </p>
      <div class="mt-6 space-y-2 text-left">
        <div v-for="r in done" :key="r.box.id" class="flex items-center gap-3 rounded-md border border-border p-3">
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

  <div v-else class="mx-auto max-w-[760px] min-[1700px]:max-w-[1100px]">
    <Crumbs :parts="[{ text: 'Experiences', to: '/experiences' }, { text: a.details.name || 'Untitled experience', to: base }, { text: 'Publish' }]" />
    <h1 class="mb-5 text-2xl font-extrabold tracking-tight">Publish</h1>

    <Alert v-if="error" variant="error" class="mb-4">{{ error }}</Alert>
    <Alert v-if="saveError" variant="error" class="mb-4" title="The last change was not saved">{{ saveError }}</Alert>

    <div class="space-y-5">
      <QCard :n="1" :title="todo.length ? 'Finish these first' : 'Everything is ready'" :miss="!!todo.length">
        <ul v-if="todo.length" class="space-y-2">
          <li v-for="(x, i) in todo" :key="i">
            <component
              :is="x.row ? 'button' : 'div'"
              type="button"
              class="flex w-full items-center gap-3 rounded-md border border-amber-200 bg-amber-50/60 px-4 py-3.5 text-left"
              :class="x.row ? 'hover:border-warning' : ''"
              @click="x.row && emit('fix', x.row)"
            >
              <span class="text-warning"><AIcon name="alert" cls="h-5 w-5" /></span>
              <span class="flex-1 text-[14px] font-semibold">{{ x.text }}</span>
              <span v-if="x.row" class="text-[13.5px] font-bold text-brand-deep">Fix it</span>
            </component>
          </li>
        </ul>
        <div v-else class="flex items-center gap-3 text-[14px] font-bold text-success"><AIcon name="checkc" cls="h-6 w-6" />Nothing is missing</div>
      </QCard>

      <QCard :n="2" title="Which Boxes should play it?" :miss="!loading && !chosen.size">
        <div v-if="loading" class="space-y-2.5">
          <Skeleton class="h-16 w-full" />
          <Skeleton class="h-16 w-full" />
        </div>
        <div v-else class="space-y-2.5">
          <label
            v-for="r in rows"
            :key="r.box.id"
            class="flex cursor-pointer items-center gap-4 rounded-md border px-4 py-4"
            :class="chosen.has(r.box.id) ? 'border-brand-deep bg-brand-deep/[.04]' : 'border-border'"
          >
            <input
              type="checkbox"
              :checked="chosen.has(r.box.id)"
              :disabled="!boxOnline(r.box.status) && !r.has"
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
            <span class="inline-flex items-center gap-2 text-[13px] font-semibold" :class="boxOnline(r.box.status) ? 'text-success' : 'text-muted-foreground'">
              <span class="h-2.5 w-2.5 rounded-full" :class="boxOnline(r.box.status) ? 'bg-success' : 'bg-muted-foreground/50'" />
              {{ boxOnline(r.box.status) ? 'Online' : 'Offline' }}
            </span>
          </label>
          <p v-if="!rows.length" class="text-[13.5px] text-muted-foreground">No Boxes yet.</p>
        </div>
      </QCard>
    </div>

    <div class="mt-8 flex flex-wrap items-center justify-end gap-4 border-t border-border pb-12 pt-6">
      <span v-if="!ready" class="text-[13.5px] font-semibold text-muted-foreground">
        <template v-if="pending">Saving…</template>
        <template v-else-if="blocked && chosen.size">{{ todo.length }} thing{{ todo.length === 1 ? '' : 's' }} left</template>
        <template v-else-if="!chosen.size && !rows.some((r) => r.has)">Choose a Box</template>
        <template v-else-if="!changed">Nothing has changed</template>
      </span>
      <button
        type="button"
        :disabled="!ready"
        :class="[btnGrad, '!rounded-md !px-8 !py-4 !text-[13.5px] disabled:cursor-not-allowed disabled:bg-none disabled:bg-input disabled:shadow-none disabled:hover:translate-y-0']"
        @click="publish"
      >
        {{ publishing ? 'Publishing…' : 'Publish' }}
      </button>
    </div>
  </div>
</template>
