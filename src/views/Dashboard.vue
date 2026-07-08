<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useAuthzStore } from '@/stores/authz'
import { getOrganisation, getProject } from '@/api/museotekBox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const authStore = useAuthStore()
const authzStore = useAuthzStore()
const { profile } = storeToRefs(authStore)
const { context, loading, error } = storeToRefs(authzStore)

// The authorization context carries only ids (it's the hot-path authz data). Resolve display
// names here for the UI, falling back to the id if a lookup is unavailable.
const orgNames = ref<Record<string, string>>({})
const experienceNames = ref<Record<string, string>>({})

async function resolveNames() {
  const ctx = context.value
  if (!ctx) return
  await Promise.all([
    ...ctx.managedOrganisations.map(async (orgId) => {
      try {
        orgNames.value[orgId] = (await getOrganisation(orgId)).name
      } catch {
        /* keep the id as the fallback label */
      }
    }),
    ...ctx.projectMemberships.map(async (m) => {
      try {
        experienceNames.value[m.projectId] = (await getProject(m.projectId)).name
      } catch {
        /* keep the id as the fallback label */
      }
    }),
  ])
}

onMounted(async () => {
  await authzStore.load()
  await resolveNames()
})
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold">Dashboard</h1>
      <p class="text-sm text-muted-foreground">
        Your identity and platform authorization, resolved by the Museotek Box Backend.
      </p>
    </div>

    <Card>
      <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
      <CardContent class="space-y-1 text-sm">
        <div><span class="text-muted-foreground">Name:</span> {{ profile?.name ?? '—' }}</div>
        <div><span class="text-muted-foreground">Username:</span> {{ profile?.username ?? '—' }}</div>
        <div><span class="text-muted-foreground">Email:</span> {{ profile?.email ?? '—' }}</div>
        <div class="break-all"><span class="text-muted-foreground">Subject:</span> {{ profile?.subject ?? '—' }}</div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle>Authorization</CardTitle></CardHeader>
      <CardContent class="space-y-3 text-sm">
        <p v-if="loading" class="text-muted-foreground">Loading…</p>
        <p v-else-if="error" class="text-destructive">{{ error }}</p>
        <template v-else-if="context">
          <div>
            <span class="text-muted-foreground">Platform admin:</span>
            <span :class="context.platformAdmin ? 'font-semibold text-primary' : 'text-muted-foreground'">
              {{ context.platformAdmin ? 'yes' : 'no' }}
            </span>
          </div>

          <div>
            <div class="text-muted-foreground">Managed organisations</div>
            <ul v-if="context.managedOrganisations.length" class="ml-4 list-disc">
              <li v-for="orgId in context.managedOrganisations" :key="orgId">
                {{ orgNames[orgId] ?? orgId }}
              </li>
            </ul>
            <p v-else class="ml-4 text-muted-foreground">none</p>
          </div>

          <div>
            <div class="text-muted-foreground">Experience memberships</div>
            <ul v-if="context.projectMemberships.length" class="ml-4 list-disc">
              <li v-for="m in context.projectMemberships" :key="m.projectId">
                <RouterLink :to="`/experiences/${m.projectId}`" class="text-primary hover:underline">
                  {{ experienceNames[m.projectId] ?? m.projectId }}
                </RouterLink>
                <span class="text-muted-foreground">({{ m.role.toLowerCase() }})</span>
              </li>
            </ul>
            <p v-else class="ml-4 text-muted-foreground">none</p>
          </div>
        </template>
      </CardContent>
    </Card>
  </div>
</template>
