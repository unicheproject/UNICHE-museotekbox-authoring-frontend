<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { describeError } from '@/api/museotekBox'
import { invalidateQueries } from '@/lib/useQuery'
import { OUTPUTS, TEMPLATES, template, type OutputId } from '@/lib/authoring/engine'
import { createExperience } from '@/lib/authoring/useAuthoring'
import { toneOf } from '@/lib/authoring/tone'
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
const steps = { name: 1, output: 2, first: 3 }

const btnDeep =
  'inline-flex items-center justify-center gap-2 rounded-md bg-brand-deep px-4 py-2.5 text-[12px] font-extrabold uppercase tracking-button text-white hover:bg-brand-deep/90 disabled:cursor-not-allowed disabled:opacity-40'
const btnOutline =
  'inline-flex items-center justify-center gap-2 rounded-md border border-input bg-white px-4 py-2.5 text-[12px] font-extrabold uppercase tracking-button text-secondary-foreground hover:border-brand-deep hover:text-brand-deep disabled:opacity-40'
const inputCls =
  'w-full rounded-md border border-input bg-white px-3 py-2 text-[14px] outline-none focus:border-brand-deep focus:ring-2 focus:ring-brand-deep/20'

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
    const { project, firstKey } = await createExperience(props.orgId, { name: name.value, output: output.value, first: first.value || null })
    invalidateQueries('projects')
    // With a first activity it opens on that activity, ready to fill in; without, on the visit.
    await router.push(firstKey ? `/experiences/${project.id}/step/${firstKey}` : `/experiences/${project.id}`)
  } catch (e) {
    error.value = describeError(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-[#0b1020]/50 p-4 backdrop-blur-[2px] sm:p-10"
      @click.self="close"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="New experience"
        class="dialog-in w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-2xl"
      >
        <div class="flex items-center gap-3 px-7 pb-2 pt-6">
          <h2 class="flex-1 text-[18px] font-extrabold">Create an experience</h2>
          <button
            type="button"
            title="Close"
            aria-label="Close"
            class="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-2"
            @click="close"
          >
            <AIcon name="x" cls="h-5 w-5" />
          </button>
        </div>

        <div class="space-y-9 p-7 pt-5">
          <section>
            <div class="mb-4 flex items-start gap-3.5">
              <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-deep text-[13.5px] font-extrabold text-white">{{ steps.name }}</span>
              <div class="pt-1">
                <label for="new-name" class="text-[15px] font-extrabold leading-snug">Name</label>
              </div>
            </div>
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
            <div class="mb-4 flex items-start gap-3.5">
              <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-deep text-[13.5px] font-extrabold text-white">{{ steps.output }}</span>
              <div class="pt-1">
                <h3 class="text-[15px] font-extrabold leading-snug">Where does it play?</h3>
                <p class="mt-1 text-[13.5px] text-muted-foreground">
                  Chosen once. The media you pick later depends on it, so it can't be changed afterwards.
                </p>
              </div>
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              <button
                v-for="o in Object.values(OUTPUTS)"
                :key="o.id"
                type="button"
                class="flex flex-col items-start gap-3 rounded-lg border p-5 text-left transition-colors"
                :class="output === o.id ? 'border-brand-deep bg-brand-deep/[.05]' : 'border-border hover:border-brand-deep/50'"
                @click="output = o.id"
              >
                <span class="flex w-full items-center gap-3">
                  <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#ede7f6] text-brand-deep">
                    <AIcon :name="o.icon" cls="h-6 w-6" />
                  </span>
                  <span class="flex-1 text-[14px] font-extrabold" :class="{ 'text-brand-deep': output === o.id }">{{ o.name }}</span>
                  <span
                    class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border"
                    :class="output === o.id ? 'border-brand-deep' : 'border-input'"
                  >
                    <span v-if="output === o.id" class="h-3 w-3 rounded-full bg-brand-deep" />
                  </span>
                </span>
                <span class="text-[13.5px] leading-relaxed text-secondary-foreground">{{ o.blurb }}</span>
              </button>
            </div>
          </section>

          <section>
            <div class="mb-4 flex items-start gap-3.5">
              <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-deep text-[13.5px] font-extrabold text-white">{{ steps.first }}</span>
              <div class="pt-1">
                <h3 class="text-[15px] font-extrabold leading-snug">
                  First activity <span class="text-[13.5px] font-semibold text-muted-foreground">(optional)</span>
                </h3>
                <p class="mt-1 text-[13.5px] text-muted-foreground">
                  What the visitor does after the welcome. You can add more, or change it, on the experience page.
                </p>
              </div>
            </div>
            <div class="grid gap-2.5 sm:grid-cols-2">
              <button
                v-for="t in tiles"
                :key="t.id"
                type="button"
                class="flex items-center gap-3.5 rounded-lg border p-3.5 text-left transition-colors"
                :class="first === t.id ? 'border-brand-deep bg-brand-deep/[.05]' : 'border-border hover:border-brand-deep/50'"
                @click="first = t.id"
              >
                <span
                  class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                  :style="{ color: toneOf(t.id || 'none')[0], background: toneOf(t.id || 'none')[1] }"
                >
                  <AIcon :name="t.icon" cls="h-5 w-5" />
                </span>
                <span class="min-w-0 flex-1 text-[14px] font-extrabold" :class="{ 'text-brand-deep': first === t.id }">{{ t.name }}</span>
                <span v-if="first === t.id" class="shrink-0 text-brand-deep"><AIcon name="check" cls="h-5 w-5" /></span>
              </button>
            </div>
          </section>

          <p v-if="error" class="rounded-sm bg-destructive/[.06] px-3 py-2 text-[13px] font-bold text-destructive">
            {{ error }}
          </p>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-4 border-t border-border px-7 py-5">
          <span class="text-[13.5px] text-muted-foreground">
            {{ first ? `Opens with the ${template(first).name} ready to fill in.` : 'Opens on the visit, starting with how it starts.' }}
          </span>
          <span class="flex flex-wrap gap-3">
            <button type="button" :class="btnOutline" :disabled="busy" @click="close">Cancel</button>
            <button type="button" :disabled="!ok" :class="btnDeep" @click="create">Create experience</button>
          </span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

