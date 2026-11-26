<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useAuthzStore } from '@/stores/authz'
import { useOrgNames } from '@/lib/useOrgNames'
import { fetchShared } from '@/lib/queries'
import { isExperience } from '@/lib/experiences'
import type { ProjectDto } from '@/api/museotekBox'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { headBtnOutline, pill, pillTone } from '@/components/experience/styles'
import ListHeader from '@/components/inventory/ListHeader.vue'
import MoreSettings from '@/components/authoring/ui/MoreSettings.vue'

/**
 * Account and authorization detail. This lived on the dashboard while proving out authentication
 * in v1, but a home screen is the most expensive space in the app and belongs to the user's work,
 * not to their credentials — so it moved here, reachable from the header's user menu.
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
  if (context.value.managedOrganisations.length) return 'Organisation manager'
  return context.value.projectMemberships.length ? 'Curator' : 'No role yet'
})

/**
 * The projects of the memberships, by id, to show names instead of ids. Read per organisation
 * through the shared cache (the Experiences screen reads the same); a project that cannot be read
 * shows its id. Projects of other tools are listed by name but not linked: they do not open here.
 */
const projects = ref<Record<string, ProjectDto>>({})
/** Until the names are read, a membership shows a placeholder rather than "can no longer open". */
const projectsReady = ref(false)
watch(
  () => Array.from(new Set((context.value?.projectMemberships ?? []).map((m) => m.orgId))),
  async (ids) => {
    const lists = await Promise.allSettled(ids.map((orgId) => fetchShared('projects', orgId)))
    const found: Record<string, ProjectDto> = {}
    for (const r of lists) if (r.status === 'fulfilled') for (const p of r.value) found[p.id] = p
    projects.value = found
    projectsReady.value = true
  },
  { immediate: true },
)

onMounted(() => authzStore.load())

/** The label of a fact, and the panels, as on a Box's or a scan object's page. */
const dt = 'text-xs font-bold uppercase tracking-overline text-muted-foreground'
const sectionHead = 'border-b border-border px-5 py-4 text-[15px] font-extrabold sm:px-6'

/** Why the memberships list is empty, in words that fit the role. */
const noMemberships = computed(() => {
  const ctx = context.value
  if (!ctx) return 'None'
  if (ctx.managedOrganisations.length) {
    const names = ctx.managedOrganisations.map((id) => orgNames.value[id]).filter(Boolean)
    return `You manage ${names.length ? names.join(', ') : 'your organisation'}, so you can open all its experiences.`
  }
  if (ctx.platformAdmin) return 'As a platform administrator, you can open every experience.'
  return "You haven't been invited to an experience yet. Ask your organisation manager to invite you."
})

/** "Curator" from the backend's constant. */
const roleWord = (role: string) => role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()

/** The sign-in id, folded under "For support": only support needs it, so it is copied, not read. */
const copied = ref(false)
async function copyId() {
  if (!profile.value?.subject) return
  try {
    await navigator.clipboard.writeText(profile.value.subject)
    copied.value = true
    window.setTimeout(() => (copied.value = false), 2000)
  } catch {
    /* clipboard refused: the id is still shown to select by hand */
  }
}
</script>

<template>
  <div>
    <ListHeader title="Account" subtitle="Your profile and what you can open" />

    <!-- Capped like a Box's page, so a few facts do not stretch across a wide screen. -->
    <div class="max-w-5xl space-y-5">
      <div class="grid gap-5 lg:grid-cols-2">
        <section class="rounded-lg bg-white shadow-xs" aria-labelledby="acc-profile">
          <h2 id="acc-profile" :class="sectionHead">Profile</h2>
          <dl class="space-y-5 px-5 py-5 text-[14px] sm:px-6">
            <div>
              <dt :class="dt">Name</dt>
              <dd class="mt-1 font-semibold">{{ profile?.name ?? '—' }}</dd>
            </div>
            <div v-if="showUsername">
              <dt :class="dt">Username</dt>
              <dd class="mt-1 font-semibold">{{ profile?.username }}</dd>
            </div>
            <div>
              <dt :class="dt">Email</dt>
              <dd class="mt-1 font-semibold">{{ profile?.email ?? '—' }}</dd>
            </div>
          </dl>
        </section>

        <section class="rounded-lg bg-white shadow-xs" aria-labelledby="acc-access">
          <h2 id="acc-access" :class="sectionHead">Access</h2>
          <div class="space-y-5 px-5 py-5 text-[14px] sm:px-6">
            <Alert v-if="error" variant="error" title="Couldn't load your permissions">{{ error }}</Alert>

            <div v-else-if="loading && !context" class="space-y-3">
              <Skeleton class="h-4 w-40" />
              <Skeleton class="h-4 w-56" />
              <Skeleton class="h-4 w-32" />
            </div>

            <template v-else-if="context">
              <div>
                <p :class="dt">Access level</p>
                <p class="mt-1 font-extrabold text-brand-deep">{{ accessLevel }}</p>
              </div>

              <div>
                <p :class="dt">Managed organisations</p>
                <ul v-if="context.managedOrganisations.length" class="mt-2 flex flex-wrap gap-1.5">
                  <!-- A name that can't be resolved is not replaced by its code. -->
                  <li v-for="orgId in context.managedOrganisations" :key="orgId" :class="[pill, pillTone.brand]">
                    {{ orgNames[orgId] ?? 'Organisation' }}
                  </li>
                </ul>
                <p v-else class="mt-1 text-muted-foreground">None</p>
              </div>

              <div>
                <p :class="dt">Experience memberships</p>
                <ul v-if="context.projectMemberships.length" class="mt-2 space-y-2">
                  <li v-for="m in context.projectMemberships" :key="m.projectId" class="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <template v-if="projects[m.projectId]">
                      <RouterLink
                        v-if="isExperience(projects[m.projectId])"
                        :to="`/experiences/${m.projectId}`"
                        class="font-semibold text-brand-deep hover:underline"
                      >
                        {{ projects[m.projectId].name }}
                      </RouterLink>
                      <span v-else class="font-semibold">{{ projects[m.projectId].name }}</span>
                    </template>
                    <Skeleton v-else-if="!projectsReady" class="h-4 w-40" />
                    <!-- Not readable any more: said in words, never as its code. -->
                    <span v-else class="text-muted-foreground">An experience you can no longer open</span>
                    <span :class="[pill, pillTone.neutral]">{{ roleWord(m.role) }}</span>
                    <span v-if="orgNames[m.orgId]" class="text-[13px] text-muted-foreground">{{ orgNames[m.orgId] }}</span>
                    <span v-if="projects[m.projectId] && !isExperience(projects[m.projectId])" class="text-[13px] text-muted-foreground">another tool</span>
                  </li>
                </ul>
                <p v-else class="mt-1 text-muted-foreground">{{ noMemberships }}</p>
              </div>
            </template>
          </div>
        </section>
      </div>

      <!-- The sign-in id is an internal code: folded away, for when support asks for it. -->
      <MoreSettings title="For support">
        <div class="flex flex-wrap items-center justify-between gap-3 text-[14px]">
          <div class="min-w-0">
            <p :class="dt">Account ID</p>
            <p class="mt-1 break-all font-mono text-xs text-muted-foreground">{{ profile?.subject ?? '—' }}</p>
          </div>
          <button v-if="profile?.subject" type="button" :class="headBtnOutline" @click="copyId">{{ copied ? 'Copied' : 'Copy' }}</button>
        </div>
      </MoreSettings>
    </div>
  </div>
</template>
