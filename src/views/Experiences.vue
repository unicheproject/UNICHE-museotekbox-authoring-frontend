<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { LayoutGrid, Rows3, Search, Trash2 } from 'lucide-vue-next'
import { useAuthzStore } from '@/stores/authz'
import { listProjects, type ProjectDto } from '@/api/museotekBox'
import { useOrgNames } from '@/lib/useOrgNames'
import { useQuery } from '@/lib/useQuery'
import { useDataList } from '@/lib/useDataList'
import { statusVariant } from '@/lib/status'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
const canSeeDeleted = computed(() => context.value?.platformAdmin === true)

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
  },
  initialSort: { key: 'name', direction: 'asc' },
  pageSize: 12,
  filters,
})

const view = ref<'cards' | 'table'>('cards')

const columns = computed<DataTableColumn<ProjectDto>[]>(() => [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'organisation', label: 'Organisation', sortable: true },
  { key: 'status', label: 'Status', sortable: true, headClass: 'w-32' },
  { key: 'slug', label: 'Slug', class: 'text-muted-foreground' },
])

const toggleBase =
  'inline-flex h-9 w-9 items-center justify-center rounded-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">Experiences</h1>
        <p class="text-sm text-muted-foreground">Museotek Box experiences you can access.</p>
      </div>
      <div class="flex items-center gap-2">
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
          :class="buttonVariants({ variant: 'gradient' })"
        >
          New Experience
        </RouterLink>
      </div>
    </div>

    <!-- Search and facets sit above the view switch so they survive switching cards ↔ table:
         both views render the same `useDataList` result. -->
    <div class="flex flex-wrap items-center gap-3">
      <label class="relative min-w-56 flex-1">
        <span class="sr-only">Search experiences by name</span>
        <Search
          class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          v-model="list.search.value"
          type="search"
          placeholder="Search by name…"
          class="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

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
        empty-title="No experiences match your filters"
        empty-hint="Try clearing the search or the filters above."
        @sort="list.toggleSort"
        @row-click="(row) => router.push(`/experiences/${row.id}`)"
      >
        <template #cell-organisation="{ row }">
          {{ orgNames[row.orgId] ?? row.orgId }}
        </template>
        <template #cell-status="{ row }">
          <Badge :variant="statusVariant(row.status)" dot>{{ row.status }}</Badge>
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
        <CardContent class="py-12 text-center">
          <p class="text-sm font-semibold">No experiences match your filters</p>
          <p class="mt-1 text-sm text-muted-foreground">
            Try clearing the search or the filters above.
          </p>
        </CardContent>
      </Card>

      <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <RouterLink v-for="exp in list.rows.value" :key="exp.id" :to="`/experiences/${exp.id}`">
          <Card class="h-full transition-colors hover:bg-secondary/50">
            <CardHeader>
              <CardTitle class="text-base">{{ exp.name }}</CardTitle>
            </CardHeader>
            <CardContent class="space-y-2 text-sm text-muted-foreground">
              <div>{{ orgNames[exp.orgId] ?? exp.orgId }}</div>
              <Badge :variant="statusVariant(exp.status)" dot>{{ exp.status }}</Badge>
            </CardContent>
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
</template>
