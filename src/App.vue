<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ChevronDown, LogOut, User } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const { profile, authenticated } = storeToRefs(authStore)

const menuOpen = ref(false)
const menuRoot = ref<HTMLElement | null>(null)

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

// Close the profile menu on any outside click or Escape.
function onDocumentClick(event: MouseEvent) {
  if (menuRoot.value && !menuRoot.value.contains(event.target as Node)) {
    menuOpen.value = false
  }
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') menuOpen.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
})

const navClass = 'text-muted-foreground hover:text-foreground'
const navActive = 'text-foreground font-medium'
</script>

<template>
  <div class="min-h-screen bg-background">
    <header class="border-b">
      <div class="container flex h-16 items-center justify-between">
        <div class="flex items-center gap-6">
          <span class="text-lg font-semibold">Museotek Box</span>
          <nav v-if="authenticated" class="flex items-center gap-4 text-sm">
            <RouterLink to="/" :class="navClass" :exact-active-class="navActive">Dashboard</RouterLink>
            <RouterLink to="/experiences" :class="navClass" :active-class="navActive">
              Experiences
            </RouterLink>
          </nav>
        </div>

        <div v-if="authenticated" ref="menuRoot" class="relative">
          <button
            class="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            :aria-expanded="menuOpen"
            aria-haspopup="menu"
            @click="toggleMenu"
          >
            <User class="h-4 w-4" />
            <span class="max-w-[12rem] truncate">{{ profile?.name ?? profile?.email ?? 'Account' }}</span>
            <ChevronDown class="h-4 w-4 text-muted-foreground" />
          </button>

          <div
            v-if="menuOpen"
            role="menu"
            class="absolute right-0 z-50 mt-2 w-64 rounded-md border bg-background p-1 shadow-md"
          >
            <div class="border-b px-3 py-2">
              <p class="truncate text-sm font-medium">{{ profile?.name ?? '—' }}</p>
              <p class="truncate text-xs text-muted-foreground">{{ profile?.email ?? '—' }}</p>
            </div>
            <button
              role="menuitem"
              class="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm hover:bg-secondary"
              @click="authStore.logout()"
            >
              <LogOut class="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
    <main class="container py-8">
      <RouterView />
    </main>
  </div>
</template>
