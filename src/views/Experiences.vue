<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthzStore } from '@/stores/authz'
import { listProjects, describeError, type ProjectDto } from '@/api/museotekBox'
import { useOrgNames } from '@/lib/useOrgNames'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const authzStore = useAuthzStore()
const { context } = storeToRefs(authzStore)
const { names: orgNames, resolve: resolveOrgNames } = useOrgNames()

const experiences = ref<ProjectDto[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const canCreate = computed(
  () => authzStore.context?.platformAdmin || (authzStore.context?.managedOrganisations.length ?? 0) > 0,
)

async function load() {
  loading.value = true
  error.value = null
  try {
    await authzStore.load()
    const ctx = context.value
    if (!ctx) return
    const orgIds = Array.from(
      new Set([...ctx.managedOrganisations, ...ctx.projectMemberships.map((m) => m.orgId)]),
    )
    await resolveOrgNames(orgIds)
    const lists = await Promise.all(orgIds.map((orgId) => listProjects(orgId)))
    experiences.value = lists.flat()
  } catch (e) {
    error.value = describeError(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Experiences</h1>
        <p class="text-sm text-muted-foreground">Museotek Box experiences you can access.</p>
      </div>
      <RouterLink v-if="canCreate" to="/experiences/new" :class="buttonVariants()">
        New Experience
      </RouterLink>
    </div>

    <p v-if="loading" class="text-sm text-muted-foreground">Loading…</p>
    <p v-else-if="error" class="text-sm text-destructive">{{ error }}</p>
    <p v-else-if="!experiences.length" class="text-sm text-muted-foreground">No experiences yet.</p>

    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <RouterLink v-for="exp in experiences" :key="exp.id" :to="`/experiences/${exp.id}`">
        <Card class="h-full transition-colors hover:bg-secondary/50">
          <CardHeader>
            <CardTitle>{{ exp.name }}</CardTitle>
          </CardHeader>
          <CardContent class="space-y-1 text-sm text-muted-foreground">
            <div>{{ orgNames[exp.orgId] ?? exp.orgId }}</div>
            <div>{{ exp.status }}</div>
          </CardContent>
        </Card>
      </RouterLink>
    </div>
  </div>
</template>
