<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useAuthzStore } from '@/stores/authz'
import { useOrgNames } from '@/lib/useOrgNames'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Account and authorization detail. This lived on the dashboard while proving out authentication
 * in v1, but a home screen is the most expensive space in the app and belongs to the user's work,
 * not to their credentials — so it moved here, reachable from the sidebar's user block.
 */
const authStore = useAuthStore()
const authzStore = useAuthzStore()
const { profile } = storeToRefs(authStore)
const { context, loading, error } = storeToRefs(authzStore)
const { names: orgNames, resolve: resolveOrgNames } = useOrgNames()

const orgIds = computed(() => {
  const ctx = context.value
  if (!ctx) return []
  return Array.from(
    new Set([...ctx.managedOrganisations, ...ctx.projectMemberships.map((m) => m.orgId)]),
  )
})

watch(orgIds, (ids) => ids.length && resolveOrgNames(ids), { immediate: true })

/** Username is only worth a row of its own when it says something the email does not. */
const showUsername = computed(
  () => Boolean(profile.value?.username) && profile.value?.username !== profile.value?.email,
)

const accessLevel = computed(() => {
  if (!context.value) return '—'
  if (context.value.platformAdmin) return 'Platform administrator'
  return context.value.managedOrganisations.length ? 'Organisation manager' : 'Contributor'
})

onMounted(() => authzStore.load())
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold">Account</h1>
      <p class="text-sm text-muted-foreground">
        Who you are signed in as, and what that lets you do.
      </p>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader class="pb-3"><CardTitle class="text-base">Profile</CardTitle></CardHeader>
        <CardContent class="pt-0">
          <dl class="space-y-3 text-sm">
            <div>
              <dt class="text-xs font-bold uppercase tracking-overline text-muted-foreground">
                Name
              </dt>
              <dd class="mt-0.5">{{ profile?.name ?? '—' }}</dd>
            </div>
            <div v-if="showUsername">
              <dt class="text-xs font-bold uppercase tracking-overline text-muted-foreground">
                Username
              </dt>
              <dd class="mt-0.5">{{ profile?.username }}</dd>
            </div>
            <div>
              <dt class="text-xs font-bold uppercase tracking-overline text-muted-foreground">
                Email
              </dt>
              <dd class="mt-0.5">{{ profile?.email ?? '—' }}</dd>
            </div>
            <div>
              <dt class="text-xs font-bold uppercase tracking-overline text-muted-foreground">
                Identifier
              </dt>
              <!-- The IdP subject: meaningless to a curator, but the first thing support will ask
                   for, so it stays on this screen rather than on the dashboard. -->
              <dd class="mt-0.5 break-all font-mono text-xs text-muted-foreground">
                {{ profile?.subject ?? '—' }}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="pb-3"><CardTitle class="text-base">Access</CardTitle></CardHeader>
        <CardContent class="space-y-4 pt-0 text-sm">
          <Alert v-if="error" variant="error" title="Couldn't load your permissions">
            {{ error }}
          </Alert>

          <div v-else-if="loading && !context" class="space-y-2">
            <Skeleton class="h-4 w-40" />
            <Skeleton class="h-4 w-56" />
            <Skeleton class="h-4 w-32" />
          </div>

          <template v-else-if="context">
            <div>
              <p class="text-xs font-bold uppercase tracking-overline text-muted-foreground">
                Access level
              </p>
              <p class="mt-1 font-bold text-brand-deep">{{ accessLevel }}</p>
            </div>

            <div>
              <p class="mb-1.5 text-xs font-bold uppercase tracking-overline text-muted-foreground">
                Managed organisations
              </p>
              <ul v-if="context.managedOrganisations.length" class="flex flex-wrap gap-1.5">
                <li v-for="orgId in context.managedOrganisations" :key="orgId">
                  <Badge variant="purple">{{ orgNames[orgId] ?? orgId }}</Badge>
                </li>
              </ul>
              <p v-else class="text-muted-foreground">None</p>
            </div>

            <div>
              <p class="mb-1.5 text-xs font-bold uppercase tracking-overline text-muted-foreground">
                Experience memberships
              </p>
              <ul v-if="context.projectMemberships.length" class="space-y-1">
                <li v-for="m in context.projectMemberships" :key="m.projectId">
                  <RouterLink
                    :to="`/experiences/${m.projectId}`"
                    class="font-semibold text-brand-deep hover:underline"
                  >
                    {{ m.projectId }}
                  </RouterLink>
                  <span class="text-muted-foreground"> · {{ m.role.toLowerCase() }}</span>
                </li>
              </ul>
              <p v-else class="text-muted-foreground">None</p>
            </div>

            <p class="border-t pt-3 text-xs text-muted-foreground">
              Permissions are re-checked on the server for every action; what you see here is only
              a mirror of them.
            </p>
          </template>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
