<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import { useAuthzStore } from '@/stores/authz'
import { deleteProject, getProject, updateProject } from '@/api/museotekBox'
import { useOrgNames } from '@/lib/useOrgNames'
import { useMutation, useQuery } from '@/lib/useQuery'
import { statusVariant } from '@/lib/status'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { FormField } from '@/components/ui/form'
import { ConfirmDialog, FormDialog } from '@/components/ui/dialog'

const route = useRoute()
const router = useRouter()

// This screen is reached both from the Experiences list and from the Dashboard, so the back link
// follows the history entry the user actually arrived from instead of always going to the list.
// Captured once at setup: the component is recreated on every navigation here.
const previousPath = (router.options.history.state.back as string | undefined) ?? null
const backLabel = previousPath === '/' ? 'Dashboard' : 'Experiences'

function goBack() {
  if (previousPath) router.back()
  else router.push('/experiences')
}
const authzStore = useAuthzStore()
const { names: orgNames, resolve: resolveOrgNames } = useOrgNames()

const projectId = computed(() => route.params.projectId as string)

const { data: experience, pending, error } = useQuery(
  () => ['project', projectId.value],
  () => getProject(projectId.value),
)

watch(experience, (value) => value && resolveOrgNames([value.orgId]), { immediate: true })

const canManage = computed(() =>
  experience.value ? authzStore.can('delete', { orgId: experience.value.orgId }) : false,
)

// Both writes invalidate the list as well as this experience, so a return to /experiences is fresh.
const update = useMutation(updateProject, { invalidates: ['project', 'projects'] })
const remove = useMutation(deleteProject, { invalidates: ['project', 'projects'] })

const editOpen = ref(false)
const editName = ref('')
const saved = ref(false)

function startEdit() {
  if (!experience.value) return
  editName.value = experience.value.name
  update.reset()
  editOpen.value = true
}

async function saveEdit() {
  if (!experience.value) return
  const outcome = await update.mutate(experience.value.id, { name: editName.value })
  if (outcome.ok) {
    editOpen.value = false
    saved.value = true
  }
}

const deleteOpen = ref(false)

async function confirmDelete() {
  if (!experience.value) return
  const outcome = await remove.mutate(experience.value.id)
  if (outcome.ok) router.push('/experiences')
}

onMounted(() => authzStore.load())
</script>

<template>
  <div class="space-y-6">
    <button
      type="button"
      class="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-overline text-muted-foreground transition-colors hover:text-foreground"
      @click="goBack"
    >
      <ArrowLeft class="h-3.5 w-3.5" />
      {{ backLabel }}
    </button>

    <Alert v-if="error" variant="error" title="Couldn't load this experience">{{ error }}</Alert>

    <Card v-else-if="pending">
      <CardHeader><Skeleton class="h-6 w-56" /></CardHeader>
      <CardContent class="space-y-2">
        <Skeleton class="h-4 w-64" />
        <Skeleton class="h-4 w-40" />
        <Skeleton class="h-4 w-48" />
      </CardContent>
    </Card>

    <template v-else-if="experience">
      <Alert v-if="saved" variant="success" dismissible @dismiss="saved = false">
        Changes saved.
      </Alert>

      <Card>
        <CardHeader>
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="space-y-2">
              <CardTitle>{{ experience.name }}</CardTitle>
              <Badge :variant="statusVariant(experience.status)" dot>{{ experience.status }}</Badge>
            </div>
            <Button v-if="canManage" variant="outline" size="sm" @click="startEdit">Edit</Button>
          </div>
        </CardHeader>
        <CardContent>
          <dl class="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt class="text-xs font-bold uppercase tracking-overline text-muted-foreground">
                Organisation
              </dt>
              <dd class="mt-1">{{ orgNames[experience.orgId] ?? experience.orgId }}</dd>
            </div>
            <div>
              <dt class="text-xs font-bold uppercase tracking-overline text-muted-foreground">
                Slug
              </dt>
              <dd class="mt-1 text-muted-foreground">{{ experience.slug }}</dd>
            </div>
            <div>
              <dt class="text-xs font-bold uppercase tracking-overline text-muted-foreground">
                Tool
              </dt>
              <dd class="mt-1 text-muted-foreground">{{ experience.toolSlug }}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card v-if="canManage">
        <CardHeader><CardTitle class="text-base">Danger zone</CardTitle></CardHeader>
        <CardContent class="space-y-3">
          <p class="text-sm text-muted-foreground">
            Deleting hides the experience from everyone. A platform administrator can restore it.
          </p>
          <Button variant="destructive" @click="deleteOpen = true">Delete experience</Button>
        </CardContent>
      </Card>
    </template>

    <FormDialog
      v-model:open="editOpen"
      title="Edit experience"
      description="Only the name can be changed — the slug and tool are fixed once created."
      submit-label="Save changes"
      :busy="update.loading.value"
      :error="update.error.value"
      :submit-disabled="!editName.trim()"
      @submit="saveEdit"
    >
      <FormField label="Name" required :error="update.fieldErrors.value.name">
        <template #default="{ id, invalid, describedBy }">
          <Input :id="id" v-model="editName" :invalid="invalid" :aria-describedby="describedBy" />
        </template>
      </FormField>
    </FormDialog>

    <ConfirmDialog
      v-model:open="deleteOpen"
      title="Delete this experience?"
      description="It can be restored by a platform admin."
      :busy="remove.loading.value"
      :error="remove.error.value"
      @confirm="confirmDelete"
    />
  </div>
</template>
