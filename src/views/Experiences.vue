<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Briefcase, LayoutGrid, Rows3, Trash2 } from 'lucide-vue-next'
import { useAuthzStore } from '@/stores/authz'
import { listProjects, type ProjectDto } from '@/api/museotekBox'
import { useOrgNames } from '@/lib/useOrgNames'
import { useQuery } from '@/lib/useQuery'
import { useDataList } from '@/lib/useDataList'
import { statusVariant } from '@/lib/status'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/input'
import { Select, type SelectOption } from '@/components/ui/select'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Pagination } from '@/components/ui/pagination'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'

const router = useRouter()
const authzStore = useAuthzStore()
const { context } = storeToRefs(authzStore)
const { names: orgNames, resolve: resolveOrgNames } = useOrgNames()

/** Every organisation the user can see experiences in: ones they manage, plus ones they are a member of. */
const orgIds = computed(() => {
  const ctx = context.value
  if (!ctx) return []
  return Array.from(
    new Set([...ctx.managedOrganisations, ...ctx.projectMemberships.map((m) => m.orgId)]),
  )
})

const canCreate = computed(
  () => context.value?.platformAdmin || (context.value?.managedOrganisations.length ?? 0) > 0,
)
const canSeeDeleted = computed(
  () => context.value?.platformAdmin === true || (context.value?.managedOrganisations.length ?? 0) > 0,
)

// There is no cross-organisation projects endpoint, so the list is the union of one call per
// organisation. The query key includes the ids, so it re-fetches when the user's orgs change.
const { data, pending, error } = useQuery(
  () => (orgIds.value.length ? ['projects', ...orgIds.value] : null),
  async () => (await Promise.all(orgIds.value.map((orgId) => listProjects(orgId)))).flat(),
)

onMounted(() => authzStore.load())
watch(orgIds, (ids) => ids.length && resolveOrgNames(ids), { immediate: true })

const orgFilter = ref('')
const statusFilter = ref('')

const orgOptions = computed<SelectOption[]>(() => [
  { value: '', label: 'All organisations' },
  ...orgIds.value.map((id) => ({ value: id, label: orgNames.value[id] ?? id })),
])

/** Statuses are not a published enum — offer exactly the ones present in the data. */
const statusOptions = computed<SelectOption[]>(() => {
  const present = Array.from(new Set((data.value ?? []).map((p) => p.status))).sort()
  return [{ value: '', label: 'All statuses' }, ...present.map((s) => ({ value: s, label: s }))]
})

const filters = computed(() => {
  const predicates: ((p: ProjectDto) => boolean)[] = []
  if (orgFilter.value) predicates.push((p) => p.orgId === orgFilter.value)
  if (statusFilter.value) predicates.push((p) => p.status === statusFilter.value)
  return predicates
})

const list = useDataList<ProjectDto>(data, {
  searchFields: (p) => [p.name],
  sortValues: {
    name: (p) => p.name,
    organisation: (p) => orgNames.value[p.orgId] ?? p.orgId,
    status: (p) => p.status,
    updated: (p) => p.updatedAt ?? '',
  },
  // Most recently touched first: the natural default for a working list. Experiences with no
  // timestamp (older backend builds) sink to the bottom rather than to the top.
  initialSort: { key: 'updated', direction: 'desc' },
  pageSize: 12,
  filters,
})

const view = ref<'cards' | 'table'>('cards')

const columns = computed<DataTableColumn<ProjectDto>[]>(() => [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'organisation', label: 'Organisation', sortable: true },
  { key: 'status', label: 'Status', sortable: true, headClass: 'w-32' },
  { key: 'updated', label: 'Updated', sortable: true, headClass: 'w-32' },
  { key: 'slug', label: 'Slug', class: 'text-muted-foreground' },
])

/** Two-letter monogram for the card's tile, the same rule the Dashboard rows use. */
function monogram(name: string) {
  const parts = name.split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '—'
}

/** Short, locale-aware date; the exact time is noise in a list. */
function formatDate(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString()
}

const toggleBase =
  'inline-flex h-9 w-9 items-center justify-center rounded-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
</script>

<template>
  <div>
    <PageHeader title="Experiences">
      <template #actions>
        <RouterLink
          v-if="canSeeDeleted"
          to="/experiences/deleted"
          :class="buttonVariants({ variant: 'secondary', size: 'sm' })"
        >
          <Trash2 class="h-3.5 w-3.5" />
          Deleted
        </RouterLink>
        <RouterLink
          v-if="canCreate"
          to="/experiences/new"
          :class="buttonVariants({ variant: 'gradient', size: 'sm' })"
        >
          New Experience
        </RouterLink>
      </template>
    </PageHeader>

    <div class="space-y-6">
      <!-- Search and facets sit above the view switch so they survive switching cards ↔ table:
           both views render the same `useDataList` result. -->
      <div class="flex flex-wrap items-center gap-3">
        <SearchInput
          v-model="list.search.value"
          label="Search experiences by name"
          placeholder="Search by name…"
        />

        <Select
          v-model="orgFilter"
          :options="orgOptions"
          class="w-52"
          aria-label="Filter by organisation"
        />
        <Select
          v-model="statusFilter"
          :options="statusOptions"
          class="w-44"
          aria-label="Filter by status"
        />

        <div class="flex items-center gap-1 rounded-md border border-border bg-card p-1">
          <button
            type="button"
            aria-label="Card view"
            :aria-pressed="view === 'cards'"
            :class="[
              toggleBase,
              view === 'cards' ? 'bg-brand-deep text-white' : 'text-muted-foreground hover:bg-secondary',
            ]"
            @click="view = 'cards'"
          >
            <LayoutGrid class="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Table view"
            :aria-pressed="view === 'table'"
            :class="[
              toggleBase,
              view === 'table' ? 'bg-brand-deep text-white' : 'text-muted-foreground hover:bg-secondary',
            ]"
            @click="view = 'table'"
          >
            <Rows3 class="h-4 w-4" />
          </button>
        </div>
      </div>

      <template v-if="view === 'table'">
        <DataTable
          :columns="columns"
          :rows="list.rows.value"
          :row-key="(row) => row.id"
          :sort-key="list.sortKey.value"
          :sort-direction="list.sortDirection.value"
          :loading="pending"
          :error="error"
          clickable
          empty-title="No experiences"
          @sort="list.toggleSort"
          @row-click="(row) => router.push(`/experiences/${row.id}`)"
        >
          <template #cell-organisation="{ row }">
            {{ orgNames[row.orgId] ?? row.orgId }}
          </template>
          <template #cell-status="{ row }">
            <Badge :variant="statusVariant(row.status)" dot>{{ row.status }}</Badge>
          </template>
          <template #cell-updated="{ row }">
            <span class="text-muted-foreground">{{ row.updatedAt ? formatDate(row.updatedAt) : '—' }}</span>
          </template>
        </DataTable>
      </template>

      <template v-else>
        <Alert v-if="error" variant="error" title="Couldn't load your experiences">{{ error }}</Alert>

        <div v-else-if="pending" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card v-for="n in 6" :key="n">
            <CardHeader><Skeleton class="h-5 w-40" /></CardHeader>
            <CardContent class="space-y-2">
              <Skeleton class="h-4 w-28" />
              <Skeleton class="h-4 w-16" />
            </CardContent>
          </Card>
        </div>

        <Card v-else-if="!list.total.value">
          <EmptyState title="No experiences" :icon="Briefcase" />
        </Card>

        <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <RouterLink
            v-for="exp in list.rows.value"
            :key="exp.id"
            :to="`/experiences/${exp.id}`"
            class="block h-full rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <!-- The card carries every column the table shows, so switching views loses nothing. -->
            <Card
              class="flex h-full flex-col p-5 shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div class="flex items-start gap-3 pb-5">
                <span
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-deep/[0.08] text-[11px] font-extrabold text-brand-deep"
                >
                  {{ monogram(exp.name) }}
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-[15px] font-bold leading-tight text-foreground">
                    {{ exp.name }}
                  </span>
                  <span class="mt-1 block truncate text-xs text-muted-foreground">
                    {{ orgNames[exp.orgId] ?? exp.orgId }}
                  </span>
                </span>
                <Badge :variant="statusVariant(exp.status)" dot>{{ exp.status }}</Badge>
              </div>

              <!-- One quiet line of metadata instead of a three-row label/value table, which read
                   as a form rather than as a card. -->
              <div
                class="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3 text-[11px] text-muted-foreground"
              >
                <span class="truncate font-mono">{{ exp.slug }}</span>
                <span class="shrink-0">{{ exp.updatedAt ? formatDate(exp.updatedAt) : '—' }}</span>
              </div>
            </Card>
          </RouterLink>
        </div>
      </template>

      <Pagination
        v-model:page="list.page.value"
        :page-size="list.pageSize.value"
        :total="list.total.value"
      />
    </div>
  </div>
</template>
