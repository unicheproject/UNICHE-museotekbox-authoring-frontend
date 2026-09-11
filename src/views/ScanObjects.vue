<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ScanLine } from 'lucide-vue-next'
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
import { SearchInput } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
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

const filters = computed(() => {
  const predicates: ((o: ScanObjectDto) => boolean)[] = []
  if (kindFilter.value) {
    predicates.push((o) => resolveScanObjectKind(o.kind) === kindFilter.value)
  }
  if (typeFilter.value) {
    predicates.push((o) => String(o.scanObjectTypeId ?? '') === typeFilter.value)
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
  { key: 'reusable', label: 'Reusable', sortable: true, align: 'right', headClass: 'w-28' },
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
  <div>
    <PageHeader title="Scan objects">
      <template #actions>
        <Select
          v-if="showPicker"
          v-model="orgId"
          :options="orgOptions"
          class="w-52"
          aria-label="Organisation"
        />
        <Button variant="gradient" size="sm" :disabled="!orgId" @click="startCreate">New scan object</Button>
      </template>
    </PageHeader>

    <div class="space-y-6">
      <div class="flex flex-wrap items-center gap-3">
        <SearchInput
          v-model="list.search.value"
          label="Search scan objects by name or RFID tag"
          placeholder="Search by name or tag…"
        />
        <Select v-model="kindFilter" :options="kindOptions" class="w-44" aria-label="Filter by kind" />
        <Select v-model="typeFilter" :options="typeOptions" class="w-36" aria-label="Filter by type" />
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
        empty-title="No scan objects"
        :empty-icon="ScanLine"
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
          <Badge :variant="row.reusable ? 'success' : 'neutral'" dot>
            {{ row.reusable ? 'Yes' : 'No' }}
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
        submit-label="Create"
        :busy="create.loading.value"
        :error="create.error.value"
        :submit-disabled="!scanObjectFormComplete(form)"
        @submit="submitCreate"
      >
          <ScanObjectFormFields v-model="form" :field-errors="create.fieldErrors.value" show-rfid />
      </FormDialog>
    </div>
  </div>
</template>
