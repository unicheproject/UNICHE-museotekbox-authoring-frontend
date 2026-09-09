<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { FolderOpen, LayoutGrid, Menu, Package, ScanLine, Sparkles, Users } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useAuthzStore } from '@/stores/authz'
import { useOrgNames } from '@/lib/useOrgNames'
import SidebarUser from '@/components/shell/SidebarUser.vue'

const route = useRoute()
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

/**
 * Below `lg` the sidebar is a slide-over drawer rather than a column: at 240px fixed it would
 * leave a phone barely 80px of usable content width. From `lg` up it is a static column again and
 * this flag is irrelevant — the drawer classes are all cancelled by `lg:` variants.
 */
const sidebarOpen = ref(false)

// Navigating is the end of the drawer's purpose, so it closes itself rather than covering the page
// the user just asked for.
watch(() => route.fullPath, () => (sidebarOpen.value = false))

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') sidebarOpen.value = false
}

watch(sidebarOpen, (open) => {
  if (open) window.addEventListener('keydown', onKey)
  else window.removeEventListener('keydown', onKey)
})

onUnmounted(() => window.removeEventListener('keydown', onKey))

// Styleguide type scale, "UI / Nav": text-sm · 600.
const navItem =
  'flex items-center gap-3 rounded-sm px-3.5 py-2.5 text-sm transition-colors duration-150'
const navIdle = 'font-semibold text-white/45 hover:bg-white/5 hover:text-white/70'
const navActive = 'bg-white/10 font-bold text-white'
</script>

<template>
  <!-- Unauthenticated (the Login screen) gets the bare canvas: no sidebar to navigate yet. -->
  <div v-if="!authenticated" class="flex min-h-screen items-center justify-center bg-background p-4">
    <RouterView />
  </div>

  <div v-else class="flex min-h-screen bg-background">
    <!-- Drawer backdrop: only ever visible below `lg`, where the sidebar overlays the content. -->
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 z-30 bg-black/50 lg:hidden"
      @click="sidebarOpen = false"
    />

    <!-- 240px, not the 216px of the styleguide's section-09 mockup: that mockup is drawn inside a
         540px-tall fake browser frame, i.e. at reduced scale. The styleguide's own type scale puts
         nav labels at text-sm/600, which needs the extra width. -->
    <aside
      class="fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 flex-col bg-brand-deep transition-transform duration-200 lg:sticky lg:bottom-auto lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0"
      :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="border-b border-white/[0.08] px-5 pb-[18px] pt-6">
        <div class="text-[17px] font-extrabold tracking-[0.02em] text-white">
          museotek<span class="bg-grad-brand bg-clip-text text-transparent">Box</span>
        </div>
        <p class="mt-1 text-[11px] font-medium text-white/40">Authoring Environment</p>
      </div>

      <nav class="flex flex-1 flex-col gap-1 overflow-y-auto px-2.5 py-4">
        <RouterLink to="/" :class="[navItem, navIdle]" :exact-active-class="navActive">
          <LayoutGrid class="h-4 w-4" />
          Dashboard
        </RouterLink>
        <RouterLink to="/experiences" :class="[navItem, navIdle]" :active-class="navActive">
          <Sparkles class="h-4 w-4" />
          Experiences
        </RouterLink>
        <RouterLink to="/scan-objects" :class="[navItem, navIdle]" :active-class="navActive">
          <ScanLine class="h-4 w-4" />
          Scan objects
        </RouterLink>
        <RouterLink to="/library" :class="[navItem, navIdle]" :active-class="navActive">
          <FolderOpen class="h-4 w-4" />
          Library
        </RouterLink>
        <RouterLink to="/boxes" :class="[navItem, navIdle]" :active-class="navActive">
          <Package class="h-4 w-4" />
          Boxes
        </RouterLink>
        <RouterLink to="/members" :class="[navItem, navIdle]" :active-class="navActive">
          <Users class="h-4 w-4" />
          Members
        </RouterLink>
      </nav>

      <SidebarUser
        :name="profile?.name ?? profile?.username ?? '—'"
        :organisation="orgLabel"
        :initials="initials"
        @sign-out="authStore.logout()"
      />
    </aside>

    <!-- min-w-0 so a wide child (the data table) can shrink instead of stretching this column. -->
    <div class="flex min-w-0 flex-1 flex-col">
      <!-- Mobile-only bar: the drawer's only way in, plus the brand mark the sidebar would show. -->
      <header
        class="sticky top-0 z-20 flex items-center gap-3 border-b border-white/[0.08] bg-brand-deep px-4 py-3 lg:hidden"
      >
        <button
          class="rounded-sm p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white/60"
          aria-label="Open navigation"
          :aria-expanded="sidebarOpen"
          @click="sidebarOpen = true"
        >
          <Menu class="h-5 w-5" />
        </button>
        <div class="text-[15px] font-extrabold tracking-[0.02em] text-white">
          museotek<span class="bg-grad-brand bg-clip-text text-transparent">Box</span>
        </div>
      </header>

      <main class="flex-1 bg-surface px-4 py-5 sm:px-6 lg:px-7 lg:py-6">
        <!-- One width cap for every screen, so the app does not read as two different layouts on a
             wide monitor (the dashboard used to cap itself while the lists ran edge to edge). -->
        <div class="mx-auto w-full max-w-[1180px]">
          <RouterView />
        </div>
      </main>
    </div>
  </div>
</template>
