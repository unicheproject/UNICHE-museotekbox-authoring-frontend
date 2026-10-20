<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  assignProjectToBox,
  boxOnline,
  describeError,
  listBoxProjects,
  listBoxes,
  listScanObjects,
  unassignProjectFromBox,
  type BoxDto,
  type ProjectDto,
} from '@/api/museotekBox'
import { OUTPUTS, validate, type Authoring } from '@/lib/authoring/engine'
import { btnOutline } from '@/lib/authoring/html'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import AIcon from './AIcon.vue'

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
}>()
/** `published`: whether it is on at least one Box now. */
const emit = defineEmits<{ back: []; published: [on: boolean] }>()

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
const ruleCount = computed(() => props.a.built.scenes.reduce((n, s) => n + s.rules.length, 0))

onMounted(async () => {
  try {
    const orgId = props.project.orgId
    const [boxes, objects] = await Promise.all([listBoxes(orgId), listScanObjects(orgId)])
    const counts = new Map<string, number>()
    for (const o of objects) if (o.scanObjectTypeId != null) counts.set(String(o.scanObjectTypeId), (counts.get(String(o.scanObjectTypeId)) || 0) + 1)
    owned.value = counts
    rows.value = await Promise.all(
      boxes.map(async (box) => {
        const projects = await listBoxProjects(orgId, box.id)
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
    emit('published', done.value.length > 0)
  } catch (e) {
    error.value = describeError(e)
  } finally {
    publishing.value = false
  }
}

const card = 'rounded-lg border border-border bg-white p-5 shadow-xs'
const overline = 'text-[10px] font-extrabold uppercase tracking-overline text-muted-foreground'
const dt = 'text-[10px] font-bold uppercase tracking-overline text-muted-foreground'
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

  <div v-else>
    <div class="mb-5">
      <button type="button" class="mb-1 flex items-center gap-1.5 text-[13px] font-bold text-muted-foreground hover:text-brand-deep" @click="emit('back')">
        ← {{ a.details.name }}
      </button>
      <h1 class="text-2xl font-extrabold tracking-tight">Publish</h1>
    </div>

    <Alert v-if="error" variant="error" class="mb-4">{{ error }}</Alert>
    <Alert v-if="saveError" variant="error" class="mb-4" title="The last change was not saved">{{ saveError }}</Alert>

    <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div class="space-y-4">
        <div :class="card">
          <div :class="overline">Before it goes out</div>
          <div class="mt-3 space-y-2">
            <div v-for="(c, i) in checks" :key="i" class="flex items-start gap-2.5 text-[13px]">
              <span
                class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-pill text-white"
                :class="c.ok ? 'bg-success' : 'bg-destructive'"
              >
                <AIcon :name="c.ok ? 'check' : 'x'" cls="h-2.5 w-2.5" />
              </span>
              <span :class="c.ok ? 'text-secondary-foreground' : 'font-semibold text-destructive'">{{ c.text }}</span>
            </div>
          </div>
        </div>

        <div :class="card">
          <div :class="overline">Where it goes</div>
          <div v-if="loading" class="mt-3 space-y-2">
            <Skeleton class="h-14 w-full" />
            <Skeleton class="h-14 w-full" />
          </div>
          <div v-else class="mt-3 space-y-2">
            <label
              v-for="r in rows"
              :key="r.box.id"
              class="flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors"
              :class="chosen.has(r.box.id) ? 'border-brand-deep' : 'border-border'"
            >
              <input
                type="checkbox"
                :checked="chosen.has(r.box.id)"
                :disabled="!boxOnline(r.box.status) && !r.has"
                class="h-4 w-4 accent-[#4c1d8b] disabled:opacity-40"
                @change="toggle(r.box.id, ($event.target as HTMLInputElement).checked)"
              />
              <span class="min-w-0 flex-1">
                <span class="block text-[13.5px] font-bold" :class="boxOnline(r.box.status) ? '' : 'text-muted-foreground'">{{ r.box.name }}</span>
                <span class="block font-mono text-[10.5px] text-muted-foreground">
                  {{ r.box.serialNumber }}<template v-if="r.installed.length">
                    · {{ r.installed.length }} experience{{ r.installed.length === 1 ? '' : 's' }} installed</template
                  >
                </span>
              </span>
              <span
                class="flex shrink-0 items-center gap-1.5 text-[11px] font-bold"
                :class="boxOnline(r.box.status) ? 'text-success' : 'text-muted-foreground'"
              >
                <span class="h-2 w-2 rounded-pill" :class="boxOnline(r.box.status) ? 'bg-success' : 'bg-muted-foreground'" />
                {{ boxOnline(r.box.status) ? 'Online' : 'Offline' }}
              </span>
            </label>
            <p v-if="!rows.length" class="text-[13px] text-muted-foreground">No boxes yet.</p>
          </div>
        </div>
      </div>

      <aside class="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <div :class="card">
          <div :class="overline">This version</div>
          <dl class="mt-3 space-y-2.5 text-[13px]">
            <div><dt :class="dt">Experience</dt><dd class="font-semibold">{{ a.details.name }}</dd></div>
            <div><dt :class="dt">Plays</dt><dd class="font-semibold">{{ OUTPUTS[a.details.output].name }}</dd></div>
            <div>
              <dt :class="dt">Contents</dt>
              <dd class="font-semibold">{{ a.islands.length }} activities · {{ a.built.scenes.length }} scenes · {{ ruleCount }} rules</dd>
            </div>
            <div><dt :class="dt">Boxes</dt><dd class="font-semibold">{{ chosen.size || 'none' }} selected</dd></div>
          </dl>
        </div>
        <button
          type="button"
          :disabled="!ready"
          class="w-full rounded-md px-4 py-3 text-[13px] font-extrabold uppercase tracking-button text-white transition-transform"
          :class="ready ? 'bg-grad-brand shadow-md hover:-translate-y-0.5' : 'cursor-not-allowed bg-muted-foreground/40'"
          @click="publish"
        >
          {{ publishing ? 'Publishing…' : pending ? 'Saving…' : 'Publish' }}
        </button>
        <button type="button" :class="[btnOutline, 'w-full']" @click="emit('back')">Back to editing</button>
      </aside>
    </div>
  </div>
</template>
