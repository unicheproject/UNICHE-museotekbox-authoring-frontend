<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { RotateCcw, Trash2 } from 'lucide-vue-next'
import { useAuthzStore } from '@/stores/authz'
import { listDeletedProjects, restoreProject, type ProjectDto } from '@/api/museotekBox'
import { useOrgNames } from '@/lib/useOrgNames'
import { useMutation, useQuery } from '@/lib/useQuery'
import { useDataList } from '@/lib/useDataList'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { Select, type SelectOption } from '@/components/ui/select'
import { Pagination } from '@/components/ui/pagination'
import { ConfirmDialog } from '@/components/ui/dialog'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'

const authzStore = useAuthzStore()
const { context } = storeToRefs(authzStore)
const { names: orgNames, resolve: resolveOrgNames } = useOrgNames()

// GET /organisations/{orgId}/projects/deleted is platform-admin-only; a non-admin never gets here.
const isAdmin = computed(() => context.value?.platformAdmin === true)

/**
 * The backend has no "list all organisations" endpoint, so even a platform admin can only be
 * offered the organisations that appear in their own authorization context. See docs/BACKEND-GAPS.md.
 */
const orgIds = computed(() => {
  const ctx = context.value
  if (!ctx) return []
  return Array.from(
    new Set([...ctx.managedOrganisations, ...ctx.projectMemberships.map((m) => m.orgId)]),
  )
})

const orgId = ref('')
watch(
  orgIds,
  (ids) => {
    if (ids.length) resolveOrgNames(ids)
    if (!orgId.value && ids.length) orgId.value = ids[0]
  },
  { immediate: true },
)

const orgOptions = computed<SelectOption[]>(() =>
  orgIds.value.map((id) => ({ value: id, label: orgNames.value[id] ?? id })),
)

const { data, pending, error } = useQuery(
  () => (orgId.value && isAdmin.value ? ['projects-deleted', orgId.value] : null),
  () => listDeletedProjects(orgId.value),
)

const list = useDataList<ProjectDto>(data, {
  searchFields: (p) => [p.name],
  sortValues: { name: (p) => p.name, slug: (p) => p.slug },
  initialSort: { key: 'name', direction: 'asc' },
  pageSize: 12,
})

// Restoring puts the experience back into the active list, so both queries must be re-read.
const restore = useMutation(restoreProject, { invalidates: ['projects-deleted', 'projects'] })

const target = ref<ProjectDto | null>(null)
const restored = ref<string | null>(null)

async function confirmRestore() {
  const project = target.value
  if (!project) return
  const outcome = await restore.mutate(project.id)
  if (outcome.ok) {
    restored.value = project.name
    target.value = null
  }
}

const columns: DataTableColumn<ProjectDto>[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'slug', label: 'Slug', sortable: true, class: 'font-mono text-xs text-muted-foreground' },
  { key: 'actions', label: '', headClass: 'w-32' },
]

onMounted(() => authzStore.load())
</script>

<template>
  <div>
    <PageHeader title="Deleted experiences" back-label="Experiences" back-to="/experiences">
      <template #actions>
        <Select
          v-if="isAdmin && orgOptions.length > 1"
          v-model="orgId"
          :options="orgOptions"
          class="w-60"
          aria-label="Organisation"
        />
      </template>
    </PageHeader>

    <div class="space-y-6">
      <Card v-if="!isAdmin">
        <EmptyState title="Only a platform administrator can restore deleted experiences" />
      </Card>

      <template v-else>
        <Alert v-if="restored" variant="success" dismissible @dismiss="restored = null">
          <strong class="font-bold">{{ restored }}</strong> was restored and is back in the
          experiences list.
        </Alert>
        <Alert v-if="restore.error.value" variant="error" title="Restore failed">
          {{ restore.error.value }}
        </Alert>

        <DataTable
          v-model:search="list.search.value"
          :columns="columns"
          :rows="list.rows.value"
          :row-key="(row) => row.id"
          :sort-key="list.sortKey.value"
          :sort-direction="list.sortDirection.value"
          :loading="pending"
          :error="error"
          searchable
          search-placeholder="Search by name…"
          empty-title="Nothing deleted"
          :empty-icon="Trash2"
          @sort="list.toggleSort"
        >
          <template #cell-actions="{ row }">
            <Button
              variant="outline"
              size="sm"
              :disabled="restore.loading.value"
              @click="target = row"
            >
              <RotateCcw class="h-3.5 w-3.5" />
              Restore
            </Button>
          </template>
        </DataTable>

        <Pagination
          v-model:page="list.page.value"
          :page-size="list.pageSize.value"
          :total="list.total.value"
        />
      </template>

      <ConfirmDialog
        :open="target !== null"
        title="Restore this experience?"
        :description="
          target
            ? `“${target.name}” will reappear in the experiences list for everyone with access.`
            : undefined
        "
        confirm-label="Restore"
        variant="default"
        :busy="restore.loading.value"
        :error="restore.error.value"
        @update:open="(open) => !open && (target = null)"
        @confirm="confirmRestore"
      />
    </div>
  </div>
</template>
