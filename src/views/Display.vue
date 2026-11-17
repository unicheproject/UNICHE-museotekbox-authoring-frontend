<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  getBox,
  getExperience,
  getOrganisation,
  listBoxProjects,
  listScanObjects,
  listScanObjectTypes,
  type ExperienceDto,
} from '@/api/museotekBox'
import { getToken, login } from '@/platform/auth'
import { onlyExperiences } from '@/lib/experiences'
import { displayTiles, type DisplayTile } from '@/lib/displayIdle'
import DisplayScreen, { type DisplayView } from '@/components/display/DisplayScreen.vue'

/**
 * A Box's display, full screen on a TV next to the Box (outside the app shell).
 *
 * Phase 1 shows the idle screen only, built from the CMS endpoints with the signed-in user's own
 * session: a manager, an admin or a curator. A curator can't read experiences they are not a
 * member of, so those tiles show the name without a start card. Playing, the Box's presence and the
 * display's own token need the backend's Phase 2 (display sessions, GET /display/idle and the
 * display WebSocket).
 */
const route = useRoute()
const orgId = computed(() => String(route.params.orgId))
const boxId = computed(() => Number(route.params.boxId))

/** Read again this often, since nothing tells the page yet that the Box's list changed. */
const REFRESH_MS = 5 * 60 * 1000
/** Until the first load succeeds, try again sooner. */
const RETRY_MS = 30 * 1000

const orgName = ref('')
const boxName = ref('')
const tiles = ref<DisplayTile[] | null>(null)
const failed = ref(false)
const stale = ref(false)
/** The sign-in behind this page ended; only signing in again brings it back. */
const expired = ref(false)

const view = computed<DisplayView>(() => {
  if (expired.value) return 'expired'
  if (tiles.value) return tiles.value.length ? 'idle' : 'empty'
  return failed.value ? 'error' : 'starting'
})

async function load(): Promise<void> {
  // A token that can no longer be refreshed means the session ended: say so, rather than letting
  // the request fail into a login redirect on a screen nobody is standing at.
  if (!(await getToken())) {
    expired.value = true
    return
  }
  try {
    const box = await getBox(orgId.value, boxId.value)
    boxName.value = box.name
    const [org, projects, types, objects] = await Promise.all([
      getOrganisation(orgId.value),
      listBoxProjects(orgId.value, boxId.value),
      listScanObjectTypes(orgId.value),
      listScanObjects(orgId.value),
    ])
    const experiences = onlyExperiences(projects)
    // An experience that can't be read (a curator's who is not its member) only loses its start
    // card, not the whole screen.
    const docs: Record<string, ExperienceDto | null> = Object.fromEntries(
      await Promise.all(experiences.map(async (p) => [p.id, await getExperience(p.id).catch(() => null)] as const)),
    )
    orgName.value = org.name
    tiles.value = displayTiles(experiences, docs, types, objects)
    failed.value = false
    stale.value = false
  } catch {
    if (tiles.value) stale.value = true
    else failed.value = true
  }
}

let timer: number | undefined
function schedule() {
  window.clearTimeout(timer)
  if (expired.value) return
  timer = window.setTimeout(async () => {
    await load()
    schedule()
  }, tiles.value ? REFRESH_MS : RETRY_MS)
}

/** For a few seconds, how to go full screen (a page can't do it without a key press or click). */
const hint = ref(false)
let hintTimer: number | undefined

onMounted(async () => {
  hint.value = !document.fullscreenElement && window.innerHeight < screen.height
  hintTimer = window.setTimeout(() => (hint.value = false), 10000)
  await load()
  schedule()
})
onUnmounted(() => {
  window.clearTimeout(timer)
  window.clearTimeout(hintTimer)
})

watch(boxName, (name) => (document.title = name ? `${name} · Display` : 'Display'), { immediate: true })
</script>

<template>
  <DisplayScreen
    :view="view"
    :org-name="orgName"
    :box-name="boxName"
    :tiles="tiles ?? []"
    :stale="stale"
    :hint="hint"
    @sign-in="login(route.fullPath)"
  />
</template>
