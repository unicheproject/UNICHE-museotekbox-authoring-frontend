<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthzStore } from '@/stores/authz'
import { getProject, updateProject, deleteProject, describeError, type ProjectDto } from '@/api/museotekBox'
import { useOrgNames } from '@/lib/useOrgNames'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/dialog'

const route = useRoute()
const router = useRouter()
const authzStore = useAuthzStore()
const { names: orgNames, resolve: resolveOrgNames } = useOrgNames()

const projectId = computed(() => route.params.projectId as string)
const experience = ref<ProjectDto | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const canManage = computed(() =>
  experience.value ? authzStore.can('delete', { orgId: experience.value.orgId }) : false,
)

const editing = ref(false)
const editName = ref('')
const saving = ref(false)

const deleteOpen = ref(false)
const deleting = ref(false)
const deleteError = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    await authzStore.load()
    experience.value = await getProject(projectId.value)
    await resolveOrgNames([experience.value.orgId])
  } catch (e) {
    error.value = describeError(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)

function startEdit() {
  if (!experience.value) return
  editName.value = experience.value.name
  editing.value = true
}

async function saveEdit() {
  if (!experience.value) return
  saving.value = true
  try {
    experience.value = await updateProject(experience.value.id, { name: editName.value })
    editing.value = false
  } catch (e) {
    error.value = describeError(e)
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  if (!experience.value) return
  deleting.value = true
  deleteError.value = null
  try {
    await deleteProject(experience.value.id)
    router.push('/experiences')
  } catch (e) {
    deleteError.value = describeError(e)
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <p v-if="loading" class="text-sm text-muted-foreground">Loading…</p>
    <p v-else-if="error" class="text-sm text-destructive">{{ error }}</p>

    <template v-else-if="experience">
      <Card>
        <CardHeader>
          <div class="flex items-center justify-between">
            <CardTitle v-if="!editing">{{ experience.name }}</CardTitle>
            <div v-else class="flex items-center gap-2">
              <Input v-model="editName" />
              <Button size="sm" :disabled="saving || !editName" @click="saveEdit">Save</Button>
              <Button size="sm" variant="outline" :disabled="saving" @click="editing = false">Cancel</Button>
            </div>
            <Button v-if="canManage && !editing" variant="outline" size="sm" @click="startEdit">Edit</Button>
          </div>
        </CardHeader>
        <CardContent class="space-y-1 text-sm text-muted-foreground">
          <div>Organisation: {{ orgNames[experience.orgId] ?? experience.orgId }}</div>
          <div>Slug: {{ experience.slug }}</div>
          <div>Status: {{ experience.status }}</div>
          <div>Tool: {{ experience.toolSlug }}</div>
        </CardContent>
      </Card>

      <Card v-if="canManage">
        <CardHeader><CardTitle>Danger zone</CardTitle></CardHeader>
        <CardContent>
          <Button variant="destructive" @click="deleteOpen = true">Delete experience</Button>
        </CardContent>
      </Card>
    </template>

    <ConfirmDialog
      v-model:open="deleteOpen"
      title="Delete this experience?"
      description="It can be restored by a platform admin."
      :busy="deleting"
      :error="deleteError"
      @confirm="confirmDelete"
    />
  </div>
</template>
