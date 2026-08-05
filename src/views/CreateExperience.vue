<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthzStore } from '@/stores/authz'
import { createProject, describeError } from '@/api/museotekBox'
import { useOrgNames } from '@/lib/useOrgNames'
import { slugify } from '@/lib/slug'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const router = useRouter()
const authzStore = useAuthzStore()
const { context } = storeToRefs(authzStore)
const { names: orgNames, resolve: resolveOrgNames } = useOrgNames()

const managedOrgIds = computed(() => context.value?.managedOrganisations ?? [])
const canCreate = computed(() => managedOrgIds.value.length > 0)

const orgId = ref('')
const name = ref('')
const slug = ref('')
const slugTouched = ref(false)
const submitting = ref(false)
const error = ref<string | null>(null)

watch(name, (value) => {
  if (!slugTouched.value) {
    slug.value = slugify(value)
  }
})

onMounted(async () => {
  await authzStore.load()
  await resolveOrgNames(managedOrgIds.value)
  if (managedOrgIds.value.length) {
    orgId.value = managedOrgIds.value[0]
  }
})

async function submit() {
  submitting.value = true
  error.value = null
  try {
    const created = await createProject(orgId.value, { name: name.value, slug: slug.value, toolSlug: 'museotekbox' })
    router.push(`/experiences/${created.id}`)
  } catch (e) {
    error.value = describeError(e)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-md space-y-6">
    <h1 class="text-2xl font-bold">New Experience</h1>

    <Card v-if="!canCreate">
      <CardContent class="pt-6 text-sm text-muted-foreground">
        You don't manage any organisation, so you can't create an experience yet.
      </CardContent>
    </Card>

    <Card v-else>
      <CardHeader><CardTitle>Details</CardTitle></CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-2">
          <label class="text-sm font-medium">Organisation</label>
          <select
            v-model="orgId"
            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option v-for="id in managedOrgIds" :key="id" :value="id">{{ orgNames[id] ?? id }}</option>
          </select>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium">Name</label>
          <Input v-model="name" placeholder="e.g. Bronze Age Gallery" />
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium">Slug</label>
          <Input v-model="slug" @input="slugTouched = true" />
        </div>

        <p v-if="error" role="alert" class="text-sm text-destructive">{{ error }}</p>

        <Button class="w-full" :disabled="submitting || !name || !slug" @click="submit">
          {{ submitting ? 'Creating…' : 'Create experience' }}
        </Button>
      </CardContent>
    </Card>
  </div>
</template>
