<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ChevronDown, LogOut, UserRound } from 'lucide-vue-next'

/**
 * The signed-in user's menu at the right end of the header, after the Portal's account menu.
 *
 * The button: initials in a circle, the short name ("J. Doe") with the organisation in grey under
 * it (screen-reader only below 768px, where just the circle and the ▾ show), and a ▾ that turns
 * over while the menu is open. It is a real button, so Tab reaches it and Enter or Space opens it;
 * Esc or a click outside closes the menu, and Esc puts focus back on the button.
 *
 * The panel: name, email, the role as a sentence (the Portal's role line), the organisation, then
 * Account and Sign out.
 */
const props = defineProps<{
  name: string
  shortName: string
  email?: string
  initials: string
  orgName?: string
  roleLine?: string | null
}>()

const emit = defineEmits<{ (e: 'signOut'): void }>()

const route = useRoute()
const open = ref(false)
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)

function close() {
  open.value = false
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    close()
    trigger.value?.focus()
  }
}

/** mousedown rather than click: the menu should be gone before the underlying element reacts. */
function onPointerDown(event: MouseEvent) {
  if (root.value && !root.value.contains(event.target as Node)) close()
}

watch(open, (isOpen) => {
  if (isOpen) {
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onPointerDown)
  } else {
    window.removeEventListener('keydown', onKey)
    window.removeEventListener('mousedown', onPointerDown)
  }
})

// Navigating away is an answer to the menu; it should not stay open over the new page.
watch(() => route.fullPath, close)

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('mousedown', onPointerDown)
})

const item =
  'flex w-full items-center gap-3 px-4 py-2 text-left text-sm font-medium text-foreground hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring'
</script>

<template>
  <!-- The negative margin lets the button's own padding sit inside the header's gutter, so the ▾
       ends on the same line as the page's right edge, as the logo starts on its left edge. -->
  <div ref="root" class="relative -mr-1.5">
    <button
      ref="trigger"
      type="button"
      class="flex items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
      :class="open && 'bg-surface-2'"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-label="`Account menu for ${props.name}`"
      @click="open = !open"
    >
      <span
        class="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-brand-deep text-xs font-bold text-white"
        aria-hidden="true"
      >
        {{ props.initials }}
      </span>
      <span class="hidden md:block md:max-w-[14rem]" aria-hidden="true">
        <span class="block truncate text-xs font-bold leading-4 text-foreground">{{ props.shortName }}</span>
        <span v-if="props.orgName" class="block truncate text-xs leading-4 text-muted-foreground">{{ props.orgName }}</span>
      </span>
      <ChevronDown
        class="h-4 w-4 flex-none text-muted-foreground transition-transform duration-150 motion-reduce:transition-none"
        :class="open && 'rotate-180'"
        aria-hidden="true"
      />
    </button>

    <div
      v-if="open"
      role="menu"
      :aria-label="`Account menu for ${props.name}`"
      class="absolute right-0 top-[calc(100%+0.5rem)] z-[80] w-max min-w-60 max-w-[min(20rem,calc(100vw-2rem))] rounded-lg bg-background py-2 shadow-[0_6px_20px_rgba(0,0,0,0.1),0_0_0_1px_rgba(3,7,18,0.08)]"
    >
      <div class="mb-2 border-b border-border px-4 pb-3 pt-2">
        <span class="block text-sm font-bold text-foreground">{{ props.name }}</span>
        <span v-if="props.email" class="block break-all text-xs text-muted-foreground">{{ props.email }}</span>
        <span v-if="props.roleLine" class="mt-2 block text-xs text-foreground">{{ props.roleLine }}</span>
        <span v-if="props.orgName" class="block text-xs text-muted-foreground">{{ props.orgName }}</span>
      </div>
      <RouterLink role="menuitem" to="/account" :class="item">
        <UserRound class="h-4 w-4 flex-none text-muted-foreground" aria-hidden="true" />
        Account
      </RouterLink>
      <button type="button" role="menuitem" :class="item" @click="close(); emit('signOut')">
        <LogOut class="h-4 w-4 flex-none text-muted-foreground" aria-hidden="true" />
        Sign out
      </button>
    </div>
  </div>
</template>
