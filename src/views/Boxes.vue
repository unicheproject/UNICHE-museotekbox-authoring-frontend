<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Package } from 'lucide-vue-next'
import {
  boxOnline,
  createBox,
  listBoxes,
  listProjects,
  type BoxDto,
} from '@/api/museotekBox'
import { useMutation, useQuery } from '@/lib/useQuery'
import { useDataList } from '@/lib/useDataList'
import { useOrgScope } from '@/lib/useOrgScope'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, SearchInput } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { Select, type SelectOption } from '@/components/ui/select'
import { Pagination } from '@/components/ui/pagination'
import { FormField } from '@/components/ui/form'
import { FormDialog } from '@/components/ui/dialog'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'

const router = useRouter()
const { orgId, orgOptions, showPicker } = useOrgScope()

const { data, pending, error, refresh } = useQuery(
  () => (orgId.value ? ['boxes', orgId.value] : null),
  () => listBoxes(orgId.value),
)

/** Only to turn `currentProjectId` into a name; the box endpoints return ids alone. */
const { data: projects } = useQuery(
  () => (orgId.value ? ['projects', orgId.value] : null),
  () => listProjects(orgId.value),
)

const projectName = computed(() => {
  const map: Record<string, string> = {}
  for (const project of projects.value ?? []) map[project.id] = project.name
  return map
})

/**
 * Box status is live state, so the list re-reads it on a timer. Polling stops while the tab is in
 * the background: nobody is watching, and a forgotten tab should not hammer the backend all day.
 */
const POLL_MS = 10_000
const timer = window.setInterval(() => {
  if (!document.hidden) void refresh()
}, POLL_MS)
onUnmounted(() => window.clearInterval(timer))

const statusFilter = ref('')

const statusOptions: SelectOption[] = [
  { value: '', label: 'Status: any' },
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Not online' },
]

const filters = computed(() => {
  const predicates: ((b: BoxDto) => boolean)[] = []
  if (statusFilter.value) {
    const want = statusFilter.value === 'online'
    predicates.push((b) => boxOnline(b.status) === want)
  }
  return predicates
})

const list = useDataList<BoxDto>(data, {
  searchFields: (b) => [b.name, b.serialNumber],
  sortValues: {
    name: (b) => b.name,
    serialNumber: (b) => b.serialNumber,
    status: (b) => (boxOnline(b.status) ? 0 : 1),
    running: (b) => (b.currentProjectId ? projectName.value[b.currentProjectId] ?? b.currentProjectId : ''),
  },
  initialSort: { key: 'name', direction: 'asc' },
  pageSize: 15,
  filters,
})

const columns: DataTableColumn<BoxDto>[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'serialNumber', label: 'Serial', sortable: true, class: 'font-mono text-xs' },
  { key: 'status', label: 'Status', sortable: true, headClass: 'w-32' },
  { key: 'running', label: 'Running experience', sortable: true },
]

// ── Create ──
const createOpen = ref(false)
const name = ref('')
const serialNumber = ref('')
const create = useMutation(createBox, { invalidates: ['boxes'] })

function startCreate() {
  name.value = ''
  serialNumber.value = ''
  create.reset()
  createOpen.value = true
}

async function submitCreate() {
  const outcome = await create.mutate(orgId.value, {
    name: name.value.trim(),
    serialNumber: serialNumber.value.trim(),
  })
  if (outcome.ok && outcome.data) {
    createOpen.value = false
    router.push(`/boxes/${orgId.value}/${outcome.data.id}`)
  }
}
</script>

<template>
  <div>
    <PageHeader title="Boxes">
      <template #actions>
        <Select
          v-if="showPicker"
          v-model="orgId"
          :options="orgOptions"
          class="w-52"
          aria-label="Organisation"
        />
        <Button variant="gradient" size="sm" :disabled="!orgId" @click="startCreate">New box</Button>
      </template>
    </PageHeader>

    <div class="space-y-6">
      <div class="flex flex-wrap items-center gap-3">
        <SearchInput
          v-model="list.search.value"
          label="Search boxes by name or serial"
          placeholder="Search by name or serial…"
        />
        <Select v-model="statusFilter" :options="statusOptions" class="w-40" aria-label="Filter by status" />
      </div>

      <DataTable
        :columns="columns"
        :rows="list.rows.value"
        :row-key="(row) => String(row.id)"
        :sort-key="list.sortKey.value"
        :sort-direction="list.sortDirection.value"
        :loading="pending"
        :error="error"
        clickable
        empty-title="No boxes"
        :empty-icon="Package"
        @sort="list.toggleSort"
        @row-click="(row) => router.push(`/boxes/${orgId}/${row.id}`)"
      >
        <template #cell-status="{ row }">
          <Badge :variant="boxOnline(row.status) ? 'success' : 'neutral'" dot>
            {{ boxOnline(row.status) ? 'Online' : row.status || 'Unknown' }}
          </Badge>
        </template>
        <template #cell-running="{ row }">
          <span v-if="row.currentProjectId">
            {{ projectName[row.currentProjectId] ?? row.currentProjectId }}
          </span>
          <span v-else class="text-muted-foreground">Nothing running</span>
        </template>
      </DataTable>

      <Pagination
        v-model:page="list.page.value"
        :page-size="list.pageSize.value"
        :total="list.total.value"
      />

      <FormDialog
        v-model:open="createOpen"
        title="New box"
        submit-label="Create"
        :busy="create.loading.value"
        :error="create.error.value"
        :submit-disabled="!name.trim() || !serialNumber.trim()"
        @submit="submitCreate"
      >
        <FormField label="Name" required :error="create.fieldErrors.value.name">
          <template #default="{ id, invalid, describedBy }">
            <Input
              :id="id"
              v-model="name"
              :invalid="invalid"
              :aria-describedby="describedBy"
              placeholder="e.g. Foyer box"
            />
          </template>
        </FormField>
        <FormField
          label="Serial number"
          required
          :error="create.fieldErrors.value.serialNumber"
          hint="Printed on the device."
        >
          <template #default="{ id, invalid, describedBy }">
            <Input
              :id="id"
              v-model="serialNumber"
              :invalid="invalid"
              :aria-describedby="describedBy"
            />
          </template>
        </FormField>
      </FormDialog>
    </div>
  </div>
</template>
