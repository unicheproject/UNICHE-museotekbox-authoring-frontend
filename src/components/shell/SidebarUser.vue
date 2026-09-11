<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ChevronUp, LogOut, UserRound } from 'lucide-vue-next'

/**
 * The signed-in user's block at the foot of the sidebar, opening a menu upwards.
 *
 * A menu rather than two inline icons: sign-out sat immediately beside the account link, at the
 * same size and colour, so the destructive action of the pair was one mis-click away. It also has
 * somewhere to grow — settings, help, switching organisation — where a row of icons does not.
 */
const props = defineProps<{
  name: string
  organisation: string
  initials: string
}>()

const emit = defineEmits<{ (e: 'signOut'): void }>()

const route = useRoute()
const open = ref(false)
const root = ref<HTMLElement | null>(null)

function close() {
  open.value = false
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
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
  'flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring'
</script>

<template>
  <div ref="root" class="relative border-t border-border px-2.5 py-3">
    <button
      type="button"
      aria-haspopup="menu"
      :aria-expanded="open"
      class="flex w-full items-center gap-3 rounded-sm px-1.5 py-1.5 text-left transition-colors hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
      :class="open && 'bg-surface-2'"
      @click="open = !open"
    >
      <span
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-deep text-[11px] font-extrabold text-white"
      >
        {{ props.initials }}
      </span>
      <span class="min-w-0 flex-1">
        <span class="block truncate text-xs font-bold text-foreground">{{ props.name }}</span>
        <span class="block truncate text-[11px] text-muted-foreground">{{ props.organisation }}</span>
      </span>
      <ChevronUp
        class="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150"
        :class="open ? 'rotate-0' : 'rotate-180'"
      />
    </button>

    <!-- Opens upward: there is nothing below it but the window edge. -->
    <div
      v-if="open"
      role="menu"
      class="absolute bottom-full left-2.5 right-2.5 z-50 mb-1.5 overflow-hidden rounded-md border border-border bg-background py-1 shadow-lg"
    >
      <RouterLink role="menuitem" to="/account" :class="[item, 'hover:bg-secondary']">
        <UserRound class="h-4 w-4 text-muted-foreground" />
        Account
      </RouterLink>
      <div class="my-1 h-px bg-border" />
      <button
        type="button"
        role="menuitem"
        :class="[item, 'text-destructive hover:bg-destructive/10']"
        @click="close(); emit('signOut')"
      >
        <LogOut class="h-4 w-4" />
        Sign out
      </button>
    </div>
  </div>
</template>
