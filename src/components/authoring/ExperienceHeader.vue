<script setup lang="ts">
import { useRouter } from 'vue-router'
import AIcon from './AIcon.vue'
import SaveState from './ui/SaveState.vue'
import { btnGrad, btnOutline } from './ui/styles'

/**
 * The top of every page of an experience, drawn once by the experience page and never by the pages
 * under it: where you are (Experiences › its name), its name, Draft or Published with Saving…/Saved,
 * and the four actions. Only the content under it changes as the author moves between steps, so
 * nothing here moves or resizes. `active` marks the action whose page is open.
 */
defineProps<{
  name: string
  base: string
  published: boolean
  saving: boolean
  saveError: boolean
  /** Open comments on the whole experience. */
  comments: number
  /** The page open under the header, when it is one of the header's own actions. */
  active?: 'comments' | 'settings' | 'publish' | null
  /** The overview itself is open: its name in the breadcrumb is the current page, not a link. */
  atOverview: boolean
}>()
const emit = defineEmits<{ comments: []; settings: []; test: []; publish: [] }>()
const router = useRouter()

const on = 'border-brand-deep text-brand-deep bg-brand-deep/[.04]'
</script>

<template>
  <div>
    <nav aria-label="You are here" class="mb-2 flex min-w-0 items-center gap-1.5 text-[13px] font-semibold">
      <button type="button" class="shrink-0 text-muted-foreground hover:text-brand-deep hover:underline" @click="router.push('/experiences')">
        Experiences
      </button>
      <AIcon name="chev" cls="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
      <span v-if="atOverview" aria-current="page" class="min-w-0 truncate text-foreground">{{ name }}</span>
      <button v-else type="button" class="min-w-0 truncate text-muted-foreground hover:text-brand-deep hover:underline" @click="router.push(base)">
        {{ name }}
      </button>
    </nav>

    <div class="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div class="min-w-0">
        <h1 class="truncate text-2xl font-bold leading-tight tracking-tight">{{ name }}</h1>
        <div class="mt-1 flex items-center gap-2 text-[13.5px] text-muted-foreground">
          <span v-if="published" class="font-bold text-success">Published</span>
          <span v-else class="font-bold text-secondary-foreground">Draft</span>
          <template v-if="!saveError">
            <span aria-hidden="true">·</span>
            <SaveState :saving="saving" />
          </template>
        </div>
      </div>
      <div class="flex w-full gap-2 sm:w-auto sm:gap-2.5">
        <button
          type="button"
          :class="[btnOutline, active === 'comments' && on]"
          :aria-current="active === 'comments' ? 'page' : undefined"
          aria-label="Comments"
          @click="emit('comments')"
        >
          <AIcon name="chat" /><span class="hidden sm:inline">Comments</span>
          <span v-if="comments" class="rounded-pill bg-brand-deep px-2 py-0.5 text-[12px] text-white">{{ comments }}</span>
        </button>
        <button
          type="button"
          :class="[btnOutline, active === 'settings' && on]"
          :aria-current="active === 'settings' ? 'page' : undefined"
          aria-label="Settings"
          @click="emit('settings')"
        >
          <AIcon name="gear" /><span class="hidden sm:inline">Settings</span>
        </button>
        <button type="button" :class="[btnOutline, 'whitespace-nowrap']" aria-label="Try it" @click="emit('test')">
          <AIcon name="play" /><span class="hidden sm:inline">Try it</span>
        </button>
        <!-- The one Publish of the experience: it opens the choice of Boxes, which publishes. -->
        <button type="button" :class="[btnGrad, 'flex-1 whitespace-nowrap sm:flex-none']" :aria-current="active === 'publish' ? 'page' : undefined" @click="emit('publish')">Publish</button>
      </div>
    </div>
  </div>
</template>
