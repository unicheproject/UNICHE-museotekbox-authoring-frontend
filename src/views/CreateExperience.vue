<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthzStore } from '@/stores/authz'
import { createProject } from '@/api/museotekBox'
import { useOrgNames } from '@/lib/useOrgNames'
import { useMutation } from '@/lib/useQuery'
import { slugify } from '@/lib/slug'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { Select, type SelectOption } from '@/components/ui/select'
import { Alert } from '@/components/ui/alert'
import { FormField } from '@/components/ui/form'

const router = useRouter()
const authzStore = useAuthzStore()
const { context } = storeToRefs(authzStore)
const { names: orgNames, resolve: resolveOrgNames } = useOrgNames()

const managedOrgIds = computed(() => context.value?.managedOrganisations ?? [])
const canCreate = computed(() => managedOrgIds.value.length > 0)

const orgOptions = computed<SelectOption[]>(() =>
  managedOrgIds.value.map((id) => ({ value: id, label: orgNames.value[id] ?? id })),
)

const orgId = ref('')
const name = ref('')
const slug = ref('')
const slugTouched = ref(false)

// The slug tracks the name until the user edits it themselves, then it is theirs to control.
watch(name, (value) => {
  if (!slugTouched.value) slug.value = slugify(value)
})

// Creating changes the experiences list, so its cached queries are dropped on success.
const create = useMutation(createProject, { invalidates: ['projects'] })

onMounted(async () => {
  await authzStore.load()
  await resolveOrgNames(managedOrgIds.value)
  if (managedOrgIds.value.length) orgId.value = managedOrgIds.value[0]
})

async function submit() {
  const outcome = await create.mutate(orgId.value, {
    name: name.value,
    slug: slug.value,
  })
  if (outcome.ok && outcome.data) router.push(`/experiences/${outcome.data.id}`)
}
</script>

<template>
  <div class="mx-auto max-w-lg">
    <PageHeader title="New Experience" back-label="Experiences" back-to="/experiences" />

    <Card v-if="!canCreate">
      <EmptyState title="You don't manage any organisation" />
    </Card>

    <Card v-else>
      <CardContent class="p-6">
        <form class="space-y-5" novalidate @submit.prevent="submit">
          <Alert v-if="create.error.value" variant="error">{{ create.error.value }}</Alert>

          <FormField label="Organisation" required :error="create.fieldErrors.value.orgId">
            <template #default="{ id, invalid }">
              <Select :id="id" v-model="orgId" :options="orgOptions" :invalid="invalid" />
            </template>
          </FormField>

          <FormField label="Name" required :error="create.fieldErrors.value.name">
            <template #default="{ id, invalid, describedBy }">
              <Input
                :id="id"
                v-model="name"
                :invalid="invalid"
                :aria-describedby="describedBy"
                placeholder="e.g. Bronze Age Gallery"
              />
            </template>
          </FormField>

          <FormField
            label="Slug"
            required
            :error="create.fieldErrors.value.slug"
            hint="Lowercase letters, numbers and dashes. Used in URLs and cannot be changed later."
          >
            <template #default="{ id, invalid, describedBy }">
              <Input
                :id="id"
                v-model="slug"
                :invalid="invalid"
                :aria-describedby="describedBy"
                @input="slugTouched = true"
              />
            </template>
          </FormField>

          <div class="flex justify-end gap-2 border-t border-border pt-5">
            <RouterLink
              to="/experiences"
              :class="buttonVariants({ variant: 'outline' })"
            >
              Cancel
            </RouterLink>
            <Button
              type="submit"
              variant="gradient"
              :disabled="create.loading.value || !name || !slug || !orgId"
            >
              {{ create.loading.value ? 'Creating…' : 'Create experience' }}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
