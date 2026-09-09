<script setup lang="ts">
import { computed, watch } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { storeToRefs } from 'pinia'
import { LayoutGrid, Library, LogOut } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useAuthzStore } from '@/stores/authz'
import { useOrgNames } from '@/lib/useOrgNames'

const authStore = useAuthStore()
const authzStore = useAuthzStore()
const { profile, authenticated } = storeToRefs(authStore)
const { context } = storeToRefs(authzStore)

const { names: orgNames, resolve: resolveOrgNames } = useOrgNames()

// The shell deliberately does NOT load the authorization context itself: AuthorizationCache has no
// in-flight de-duplication, so a load() here would race the view's own load() into two identical
// requests on first paint. Instead we react to whatever the routed view has already fetched.
const primaryOrgId = computed(
  () => context.value?.managedOrganisations[0] ?? context.value?.projectMemberships[0]?.orgId,
)
watch(primaryOrgId, (orgId) => orgId && resolveOrgNames([orgId]), { immediate: true })

const orgLabel = computed(() => {
  const orgId = primaryOrgId.value
  if (!orgId) return context.value?.platformAdmin ? 'Platform administrator' : 'No organisation'
  return orgNames.value[orgId] ?? orgId
})

/** Initials for the sidebar avatar, e.g. "Marco Rossi" → "MR". */
const initials = computed(() => {
  const source = profile.value?.name ?? profile.value?.email ?? ''
  const parts = source.split(/[\s.@_-]+/).filter(Boolean)
  const letters = (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')
  return letters.toUpperCase() || '—'
})

// Styleguide type scale, "UI / Nav": text-sm · 600.
const navItem =
  'flex items-center gap-3 rounded-sm px-3.5 py-2.5 text-sm transition-colors duration-150'
const navIdle = 'font-semibold text-white/45 hover:bg-white/5 hover:text-white/70'
const navActive = 'bg-white/10 font-bold text-white'
</script>

<template>
  <!-- Unauthenticated (the Login screen) gets the bare canvas: no sidebar to navigate yet. -->
  <div v-if="!authenticated" class="min-h-screen bg-background">
    <RouterView />
  </div>

  <div v-else class="flex min-h-screen bg-background">
    <!-- 240px, not the 216px of the styleguide's section-09 mockup: that mockup is drawn inside a
         540px-tall fake browser frame, i.e. at reduced scale. The styleguide's own type scale puts
         nav labels at text-sm/600, which needs the extra width to sit comfortably. -->
    <aside class="flex w-60 shrink-0 flex-col bg-brand-deep">
      <div class="border-b border-white/[0.08] px-5 pb-[18px] pt-6">
        <div class="text-[17px] font-extrabold tracking-[0.02em] text-white">
          museotek<span class="bg-grad-brand bg-clip-text text-transparent">Box</span>
        </div>
        <p class="mt-1 text-[11px] font-medium text-white/40">Authoring Environment</p>
      </div>

      <nav class="flex flex-1 flex-col gap-1 px-2.5 py-4">
        <RouterLink to="/" :class="[navItem, navIdle]" :exact-active-class="navActive">
          <LayoutGrid class="h-4 w-4" />
          Dashboard
        </RouterLink>
        <RouterLink to="/experiences" :class="[navItem, navIdle]" :active-class="navActive">
          <Library class="h-4 w-4" />
          Experiences
        </RouterLink>
      </nav>

      <div class="flex items-center gap-3 border-t border-white/[0.08] px-4 py-4">
        <div
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-purple text-[11px] font-extrabold text-white"
        >
          {{ initials }}
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-xs font-bold text-white">
            {{ profile?.name ?? profile?.username ?? '—' }}
          </p>
          <p class="truncate text-[11px] text-white/40">{{ orgLabel }}</p>
        </div>
        <button
          class="shrink-0 rounded-sm p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white/60"
          title="Sign out"
          aria-label="Sign out"
          @click="authStore.logout()"
        >
          <LogOut class="h-4 w-4" />
        </button>
      </div>
    </aside>

    <main class="flex-1 overflow-y-auto bg-surface px-7 py-6">
      <RouterView />
    </main>
  </div>
</template>
