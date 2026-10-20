<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { describeError } from '@/api/museotekBox'
import { invalidateQueries } from '@/lib/useQuery'
import { OUTPUTS, TEMPLATES, template, type OutputId } from '@/lib/authoring/engine'
import { btnOutline, btnPrimary, inputCls } from '@/lib/authoring/html'
import { createExperience } from '@/lib/authoring/useAuthoring'
import AIcon from '@/components/authoring/AIcon.vue'

/**
 * Creating an experience: a short dialog over the list. Only what cannot wait — its name and where
 * it plays — plus, if the author already knows it, the first activity. How it starts is set on the
 * experience itself.
 */
const props = defineProps<{ orgId: string }>()
const emit = defineEmits<{ close: [] }>()

const router = useRouter()

const tiles = [{ id: '', name: 'Decide later', icon: 'plus' }, ...TEMPLATES]

const name = ref('')
const output = ref<OutputId>('DISPLAY')
const first = ref('')
const busy = ref(false)
const error = ref<string | null>(null)
const nameEl = ref<HTMLInputElement | null>(null)

const ok = computed(() => !!name.value.trim() && !!props.orgId && !busy.value)

function close() {
  // A create in flight must not be abandoned half-way — the request would still land.
  if (!busy.value) emit('close')
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

onMounted(async () => {
  window.addEventListener('keydown', onKey)
  await nextTick()
  nameEl.value?.focus()
})
onUnmounted(() => window.removeEventListener('keydown', onKey))

async function create() {
  if (!ok.value) return
  busy.value = true
  error.value = null
  try {
    const { project } = await createExperience(props.orgId, { name: name.value, output: output.value, first: first.value || null })
    invalidateQueries('projects')
    await router.push(`/experiences/${project.id}`)
  } catch (e) {
    error.value = describeError(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-40 flex items-start justify-center px-6 py-10">
      <div class="absolute inset-0 bg-[rgba(17,24,39,.55)]" @click="close" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="New experience"
        class="relative flex max-h-full w-full max-w-[52rem] flex-col rounded-[.75rem] bg-white shadow-[0_20px_50px_rgba(17,24,39,.35)]"
      >
        <div class="flex items-start justify-between gap-3 border-b border-border px-8 py-5">
          <div>
            <div class="text-[10px] font-extrabold uppercase tracking-overline text-muted-foreground">New experience</div>
            <div class="text-[17px] font-extrabold leading-tight">Create an experience</div>
          </div>
          <button type="button" title="Close" class="rounded-sm p-1.5 text-muted-foreground hover:bg-surface-2" @click="close">
            <AIcon name="x" cls="h-4 w-4" />
          </button>
        </div>

        <div class="min-h-0 flex-1 space-y-7 overflow-y-auto px-8 py-7">
          <section>
            <label for="new-name" class="mb-2 block text-[13px] font-extrabold">Name</label>
            <input
              id="new-name"
              ref="nameEl"
              v-model="name"
              :class="inputCls"
              placeholder="e.g. Bronze Age Gallery"
              autocomplete="off"
              @keydown.enter="create"
            />
          </section>

          <section>
            <div class="text-[13px] font-extrabold">Where does it play?</div>
            <p class="mb-3 mt-0.5 text-[12px] text-muted-foreground">
              Chosen once. The media you pick later depends on it, so it can't be changed afterwards.
            </p>
            <div class="grid gap-3 sm:grid-cols-2">
              <button
                v-for="o in Object.values(OUTPUTS)"
                :key="o.id"
                type="button"
                class="flex flex-col items-start rounded-lg border-2 p-4 text-left transition-colors"
                :class="output === o.id ? 'border-brand-deep bg-brand-deep/[.04]' : 'border-border hover:border-brand-deep'"
                @click="output = o.id"
              >
                <span class="flex items-center gap-2.5">
                  <span class="flex h-9 w-9 items-center justify-center rounded-md bg-surface-2 text-brand-deep">
                    <AIcon :name="o.icon" cls="h-5 w-5" />
                  </span>
                  <span class="text-[14px] font-extrabold">{{ o.name }}</span>
                  <span v-if="output === o.id" class="text-brand-deep"><AIcon name="check" cls="h-4 w-4" /></span>
                </span>
                <span class="mt-2 text-[12.5px] leading-relaxed text-secondary-foreground">{{ o.blurb }}</span>
              </button>
            </div>
          </section>

          <section>
            <div class="text-[13px] font-extrabold">
              First activity <span class="font-bold text-muted-foreground">(optional)</span>
            </div>
            <p class="mb-3 mt-0.5 text-[12px] text-muted-foreground">
              What the visitor does after the welcome. You can add more, or change it, on the experience page.
            </p>
            <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <button
                v-for="t in tiles"
                :key="t.id"
                type="button"
                class="flex items-center gap-2.5 rounded-md border-2 px-3 py-2.5 text-left text-[13px] font-extrabold transition-colors"
                :class="first === t.id ? 'border-brand-deep bg-brand-deep/[.04] text-brand-deep' : 'border-border hover:border-brand-deep'"
                @click="first = t.id"
              >
                <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-2 text-brand-deep">
                  <AIcon :name="t.icon" cls="h-3.5 w-3.5" />
                </span>
                <span class="min-w-0 flex-1 truncate">{{ t.name }}</span>
                <span v-if="first === t.id" class="shrink-0"><AIcon name="check" cls="h-4 w-4" /></span>
              </button>
            </div>
          </section>

          <p v-if="error" class="rounded-sm bg-destructive/[.06] px-3 py-2 text-[12.5px] font-bold text-destructive">
            {{ error }}
          </p>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 border-t border-border px-8 py-4">
          <span class="text-[12px] text-muted-foreground">
            {{ first ? `Opens with the ${template(first).name} ready to fill in.` : 'Opens on the visit, starting with how it starts.' }}
          </span>
          <span class="flex items-center gap-2">
            <button type="button" :class="btnOutline" :disabled="busy" @click="close">Cancel</button>
            <button type="button" :disabled="!ok" :class="[btnPrimary, 'px-5']" @click="create">Create experience</button>
          </span>
        </div>
      </div>
    </div>
  </Teleport>
</template>
