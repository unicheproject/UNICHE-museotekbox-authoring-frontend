<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Search } from 'lucide-vue-next'
import {
  KIND_LABEL,
  SCAN_OBJECT_KINDS,
  createScanObject,
  listScanObjects,
  resolveScanObjectKind,
  type ScanObjectDto,
} from '@/api/museotekBox'
import { useMutation, useQuery } from '@/lib/useQuery'
import { useDataList } from '@/lib/useDataList'
import { useOrgScope } from '@/lib/useOrgScope'
import {
  emptyScanObjectForm,
  scanObjectFormComplete,
  toScanObjectRequest,
} from '@/lib/scanObjectForm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, type SelectOption } from '@/components/ui/select'
import { Pagination } from '@/components/ui/pagination'
import { FormDialog } from '@/components/ui/dialog'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import ScanObjectFormFields from '@/components/scan/ScanObjectFormFields.vue'

const router = useRouter()
const { orgId, orgOptions, showPicker } = useOrgScope()

const { data, pending, error } = useQuery(
  () => (orgId.value ? ['scan-objects', orgId.value] : null),
  () => listScanObjects(orgId.value),
)

const kindFilter = ref('')
const typeFilter = ref('')
const reusableFilter = ref('')
const rfidFilter = ref('')

const kindOptions = computed<SelectOption[]>(() => [
  { value: '', label: 'All kinds' },
  ...SCAN_OBJECT_KINDS.map((kind) => ({ value: kind, label: KIND_LABEL[kind] })),
])

/**
 * Types can only be offered as the raw ids present in the data: the backend has no endpoint
 * listing scan object types, so there are no names to show (see docs/BACKEND-GAPS.md).
 */
const typeOptions = computed<SelectOption[]>(() => {
  const ids = Array.from(
    new Set((data.value ?? []).map((o) => o.scanObjectTypeId).filter((id): id is number => id !== null)),
  ).sort((a, b) => a - b)
  return [
    { value: '', label: 'All types' },
    ...ids.map((id) => ({ value: String(id), label: `Type ${id}` })),
  ]
})

const reusableOptions: SelectOption[] = [
  { value: '', label: 'Reusable: any' },
  { value: 'yes', label: 'Reusable' },
  { value: 'no', label: 'Single use' },
]

const rfidOptions: SelectOption[] = [
  { value: '', label: 'RFID: any' },
  { value: 'yes', label: 'Has RFID tag' },
  { value: 'no', label: 'No RFID tag' },
]

const filters = computed(() => {
  const predicates: ((o: ScanObjectDto) => boolean)[] = []
  if (kindFilter.value) {
    predicates.push((o) => resolveScanObjectKind(o.kind) === kindFilter.value)
  }
  if (typeFilter.value) {
    predicates.push((o) => String(o.scanObjectTypeId ?? '') === typeFilter.value)
  }
  if (reusableFilter.value) {
    const want = reusableFilter.value === 'yes'
    predicates.push((o) => Boolean(o.reusable) === want)
  }
  if (rfidFilter.value) {
    const want = rfidFilter.value === 'yes'
    predicates.push((o) => Boolean(o.rfidTag) === want)
  }
  return predicates
})

const list = useDataList<ScanObjectDto>(data, {
  // The tag is worth searching too: finding the object a physical tag belongs to is a real task.
  searchFields: (o) => [o.name, o.rfidTag],
  sortValues: {
    name: (o) => o.name,
    kind: (o) => kindLabel(o),
    type: (o) => o.scanObjectTypeId,
    rfidTag: (o) => o.rfidTag,
    reusable: (o) => (o.reusable ? 1 : 0),
  },
  initialSort: { key: 'name', direction: 'asc' },
  pageSize: 15,
  filters,
})

function kindLabel(object: ScanObjectDto): string {
  const kind = resolveScanObjectKind(object.kind)
  // An unmapped kind shows the backend's own value rather than a guess.
  return kind ? KIND_LABEL[kind] : object.kind || '—'
}

const columns: DataTableColumn<ScanObjectDto>[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'kind', label: 'Kind', sortable: true },
  { key: 'type', label: 'Type', sortable: true, headClass: 'w-24' },
  { key: 'rfidTag', label: 'RFID tag', sortable: true },
  { key: 'reusable', label: 'Reusable', sortable: true, headClass: 'w-28' },
]

// ── Create ──
const createOpen = ref(false)
const form = ref(emptyScanObjectForm('DRAFT'))
const create = useMutation(createScanObject, { invalidates: ['scan-objects'] })

function startCreate() {
  form.value = emptyScanObjectForm('DRAFT')
  create.reset()
  createOpen.value = true
}

async function submitCreate() {
  const outcome = await create.mutate(orgId.value, form.value.kind, toScanObjectRequest(form.value))
  if (outcome.ok && outcome.data) {
    createOpen.value = false
    router.push(`/scan-objects/${orgId.value}/${outcome.data.id}`)
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">Scan objects</h1>
        <p class="text-sm text-muted-foreground">
          The physical objects a museotekBox recognises: cards, printed images, 3D prints and
          drafts.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Select
          v-if="showPicker"
          v-model="orgId"
          :options="orgOptions"
          class="w-52"
          aria-label="Organisation"
        />
        <Button variant="gradient" :disabled="!orgId" @click="startCreate">New scan object</Button>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <label class="relative min-w-56 flex-1">
        <span class="sr-only">Search scan objects by name or RFID tag</span>
        <Search
          class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          v-model="list.search.value"
          type="search"
          placeholder="Search by name or tag…"
          class="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      <Select v-model="kindFilter" :options="kindOptions" class="w-44" aria-label="Filter by kind" />
      <Select v-model="typeFilter" :options="typeOptions" class="w-36" aria-label="Filter by type" />
      <Select
        v-model="reusableFilter"
        :options="reusableOptions"
        class="w-40"
        aria-label="Filter by reusability"
      />
      <Select v-model="rfidFilter" :options="rfidOptions" class="w-40" aria-label="Filter by RFID tag" />
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
      empty-title="No scan objects match your filters"
      empty-hint="Create one, or clear the search and filters above."
      @sort="list.toggleSort"
      @row-click="(row) => router.push(`/scan-objects/${orgId}/${row.id}`)"
    >
      <template #cell-kind="{ row }">{{ kindLabel(row) }}</template>
      <template #cell-type="{ row }">
        <span v-if="row.scanObjectTypeId !== null">{{ row.scanObjectTypeId }}</span>
        <span v-else class="text-muted-foreground">—</span>
      </template>
      <template #cell-rfidTag="{ row }">
        <span v-if="row.rfidTag" class="font-mono text-xs">{{ row.rfidTag }}</span>
        <span v-else class="text-muted-foreground">Not tagged</span>
      </template>
      <template #cell-reusable="{ row }">
        <Badge :variant="row.reusable ? 'success' : 'neutral'">
          {{ row.reusable ? 'Reusable' : 'Single use' }}
        </Badge>
      </template>
    </DataTable>

    <Pagination
      v-model:page="list.page.value"
      :page-size="list.pageSize.value"
      :total="list.total.value"
    />

    <FormDialog
      v-model:open="createOpen"
      title="New scan object"
      description="The fields below follow the kind you choose."
      submit-label="Create"
      :busy="create.loading.value"
      :error="create.error.value"
      :submit-disabled="!scanObjectFormComplete(form)"
      @submit="submitCreate"
    >
      <ScanObjectFormFields v-model="form" :field-errors="create.fieldErrors.value" show-rfid />
    </FormDialog>
  </div>
</template>
