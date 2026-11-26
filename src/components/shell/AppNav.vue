<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { Briefcase, LayoutGrid, Package, ScanLine, Users } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { useAuthzStore } from '@/stores/authz'
import { managesAnyOrg } from '@/platform/authz'

/**
 * The menu column: one plain list, each item with its icon. Items are inset from the column's
 * edges with rounded hover and current-page backgrounds, and the icons start 24px from the left
 * edge, on the same line as the header's logo. Below 768px it is a "Menu" disclosure above the
 * page that closes when a page opens.
 */
const route = useRoute()
const { context } = storeToRefs(useAuthzStore())

const items = computed(() => [
  { to: '/', label: 'Dashboard', icon: LayoutGrid },
  { to: '/experiences', label: 'Experiences', icon: Briefcase },
  { to: '/scan-objects', label: 'Scan objects', icon: ScanLine },
  { to: '/boxes', label: 'Boxes', icon: Package },
  // Only managers can read an organisation's members; nobody else gets a link to an error.
  ...(managesAnyOrg(context.value) ? [{ to: '/members', label: 'Members', icon: Users }] : []),
])

/** Dashboard matches "/" only; every other item also matches the pages under it. */
function isActive(to: string): boolean {
  if (to === '/') return route.path === '/'
  return route.path === to || route.path.startsWith(to + '/')
}

const open = ref(false)
watch(() => route.fullPath, () => (open.value = false))
</script>

<template>
  <div class="flex-none border-b border-border bg-background px-6 py-2 md:hidden">
    <button
      type="button"
      class="flex items-center gap-2 text-sm font-bold text-brand-deep"
      aria-controls="app-nav"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span aria-hidden="true">{{ open ? '✕' : '☰' }}</span> Menu
    </button>
  </div>
  <nav
    id="app-nav"
    aria-label="Primary"
    class="app-nav overflow-y-auto overflow-x-hidden overscroll-contain border-b border-border bg-background px-2 pb-4 pt-2.5 md:sticky md:top-0 md:flex md:h-screen md:w-[14.75rem] md:flex-[0_0_14.75rem] md:flex-col md:border-b-0 md:border-r md:pb-3"
    :class="open ? 'block' : 'hidden'"
  >
    <RouterLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="nav-item"
      :class="{ active: isActive(item.to) }"
      :aria-current="isActive(item.to) ? 'page' : undefined"
    >
      <component :is="item.icon" class="h-4 w-4 flex-none" aria-hidden="true" />
      {{ item.label }}
    </RouterLink>
  </nav>
</template>

<style scoped>
/* Opened above the page on a small screen, the menu keeps part of the page in view and scrolls itself. */
@media (max-width: 767.98px) and (min-height: 420px) {
  .app-nav {
    max-height: 55dvh;
  }
}
/*
 * An inset item: 8px from the column's edges (the nav's px-2), 16px of padding, so the icon starts
 * 24px from the edge like the header's logo. Icons take the text colour: grey, or the app's purple
 * on the current page.
 */
.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: hsl(var(--secondary-foreground));
  text-decoration: none;
  white-space: nowrap;
  transition: background-color 150ms, color 150ms;
}
.nav-item + .nav-item {
  margin-top: 2px;
}
.nav-item:hover {
  background: hsl(var(--surface-2));
  color: hsl(var(--foreground));
}
.nav-item:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: -2px;
}
.nav-item.active,
.nav-item.active:hover {
  background: rgba(76, 29, 139, 0.08);
  font-weight: 700;
  color: hsl(var(--brand-deep));
}
/* Beside the page: 36px rows. */
@media (min-width: 768px) {
  .nav-item {
    flex: 0 0 2.25rem;
    padding-top: 0;
    padding-bottom: 0;
    line-height: 1.25;
  }
}
@media (prefers-reduced-motion: reduce) {
  .nav-item {
    transition: none;
  }
}
</style>
