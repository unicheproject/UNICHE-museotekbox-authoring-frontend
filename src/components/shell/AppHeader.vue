<script setup lang="ts">
import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useAuthzStore } from '@/stores/authz'
import { useOrgNames } from '@/lib/useOrgNames'
import { currentOrgId, roleLine } from '@/lib/account'
import UserMenu from '@/components/shell/UserMenu.vue'

/**
 * The app's top bar, as thin as iGuide's and the Portal's: UNICHE │ MuseotekBox at the left, the
 * user's menu at the right. The organisation is a grey line under the user's name (inside the
 * menu below 768px), and the role is a sentence inside the menu, not a chip in the bar.
 */
const authStore = useAuthStore()
const { profile } = storeToRefs(authStore)
const { context } = storeToRefs(useAuthzStore())
const { names: orgNames, resolve: resolveOrgNames } = useOrgNames()

// The shell deliberately does NOT load the authorization context itself: AuthorizationCache has no
// in-flight de-duplication, so a load() here would race the view's own load() into two identical
// requests on first paint. Instead we react to whatever the routed view has already fetched.
const orgId = computed(() => currentOrgId(context.value))
watch(orgId, (id) => id && resolveOrgNames([id]), { immediate: true })

const orgName = computed(() => (orgId.value ? orgNames.value[orgId.value] : undefined))
const role = computed(() => roleLine(context.value, orgName.value))

const fullName = computed(() => profile.value?.name ?? profile.value?.username ?? '—')

/** "Marco Rossi" → "M. Rossi", as iGuide shows it; a single word stays as it is. */
const shortName = computed(() => {
  const parts = (profile.value?.name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0].toUpperCase()}. ${parts[parts.length - 1]}`
  return fullName.value
})

/** Initials for the avatar, e.g. "Marco Rossi" → "MR". */
const initials = computed(() => {
  const source = profile.value?.name ?? profile.value?.email ?? ''
  const parts = source.split(/[\s.@_-]+/).filter(Boolean)
  const letters = (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')
  return letters.toUpperCase() || '—'
})
</script>

<template>
  <!-- Two sizes (16px, 12px) and two weights (bold, regular) in the whole bar, as in the Portal. -->
  <header
    class="flex h-16 flex-none items-center gap-3 border-b border-border bg-background px-6"
  >
    <!-- The UNICHE wordmark alone: the colour logo cropped after its divider, so
         the cloud mark before it is left out. -->
    <!-- Platform │ tool, as the Portal's wordmark: one 1×24px line, #d1d5db, 12px either side. -->
    <span class="flex flex-none items-center gap-3">
      <img src="/uniche-logo-wordmark.jpg" alt="UNICHE" width="492" height="96" class="block h-5 w-auto mix-blend-multiply sm:h-[1.625rem]" />
      <span aria-hidden="true" class="h-6 w-px flex-none bg-[#d1d5db]" />
      <!-- The tool's name as text, like "Portal" in the Portal; the cube logo stays on the sign-in
           page and in the favicon, where it has room. -->
      <span class="text-base font-bold leading-none text-foreground">MuseotekBox</span>
    </span>

    <UserMenu
      class="ml-auto"
      :name="fullName"
      :short-name="shortName"
      :email="profile?.email"
      :initials="initials"
      :org-name="orgName"
      :role-line="role"
      @sign-out="authStore.logout()"
    />
  </header>
</template>
