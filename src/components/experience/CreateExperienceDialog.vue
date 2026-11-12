<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { describeError } from '@/api/museotekBox'
import { invalidateQueries } from '@/lib/useQuery'
import { OUTPUTS, TEMPLATES, template, type OutputId } from '@/lib/authoring/engine'
import { createExperience } from '@/lib/authoring/useAuthoring'
import { toneOf } from '@/lib/authoring/tone'
import AIcon from '@/components/authoring/AIcon.vue'
import {
  bigInput as inputCls,
  btnDeep,
  btnOutline,
  dialogBody,
  dialogBox,
  dialogClose,
  dialogFoot,
  dialogHead,
  dialogTitle,
  overlay,
} from '@/components/authoring/ui/styles'

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

/** Section numbers: quiet, so they don't read as the experience's own step numbers. */
const num = 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-deep/10 text-[12.5px] font-extrabold text-brand-deep'

const name = ref('')
const output = ref<OutputId>('DISPLAY')
const first = ref('')
const busy = ref(false)
const error = ref<string | null>(null)
const nameEl = ref<HTMLInputElement | null>(null)

// What happens after Create, so the author knows where they will land.
const next = computed(() =>
  first.value ? `Next, you'll fill in the ${template(first.value).name}.` : "Next, you'll set up how the visit starts.",
)

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
    <div :class="overlay" @click.self="close">
      <div role="dialog" aria-modal="true" aria-label="New experience" :class="[dialogBox, 'max-w-3xl']">
        <div :class="[dialogHead, 'items-center']">
          <h2 :class="[dialogTitle, 'min-w-0 flex-1']">New experience</h2>
          <button type="button" title="Close" aria-label="Close" :class="dialogClose" @click="close">
            <AIcon name="x" cls="h-5 w-5" />
          </button>
        </div>

        <div :class="[dialogBody, 'space-y-8']">
          <section>
            <div class="mb-3 flex items-center gap-3">
              <span :class="num">{{ steps.name }}</span>
              <label for="new-name" class="text-[15px] font-extrabold leading-snug">Name</label>
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
            <div class="mb-3 flex items-start gap-3">
              <span :class="num">{{ steps.output }}</span>
              <div class="min-w-0 pt-0.5">
                <h3 class="text-[15px] font-extrabold leading-snug">Where will visitors see and hear it?</h3>
                <p class="mt-1 text-[13.5px] leading-snug text-secondary-foreground">
                  This can't be changed later, because the pictures, videos and sounds you add depend on it.
                </p>
              </div>
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              <button
                v-for="o in Object.values(OUTPUTS)"
                :key="o.id"
                type="button"
                :aria-pressed="output === o.id"
                class="flex flex-col items-start gap-3 rounded-lg border p-4 text-left transition-colors sm:p-5"
                :class="output === o.id ? 'border-brand-deep bg-brand-deep/[.05]' : 'border-border hover:border-brand-deep/50'"
                @click="output = o.id"
              >
                <span class="flex w-full items-center gap-3">
                  <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ede7f6] text-brand-deep">
                    <AIcon :name="o.icon" cls="h-6 w-6" />
                  </span>
                  <span class="flex-1 text-[14px] font-extrabold" :class="{ 'text-brand-deep': output === o.id }">{{ o.name }}</span>
                  <span
                    class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
                    :class="output === o.id ? 'border-brand-deep' : 'border-input'"
                  >
                    <span v-if="output === o.id" class="h-2.5 w-2.5 rounded-full bg-brand-deep" />
                  </span>
                </span>
                <span class="text-[13.5px] leading-relaxed text-secondary-foreground">{{ o.blurb }}</span>
              </button>
            </div>
          </section>

          <section>
            <div class="mb-3 flex items-start gap-3">
              <span :class="num">{{ steps.first }}</span>
              <div class="min-w-0 pt-0.5">
                <h3 class="text-[15px] font-extrabold leading-snug">
                  First activity <span class="text-[13.5px] font-semibold text-muted-foreground">(optional)</span>
                </h3>
                <p class="mt-1 text-[13.5px] leading-snug text-secondary-foreground">
                  What visitors do after the start. You can add more activities later.
                </p>
              </div>
            </div>
            <div class="grid gap-2.5 sm:grid-cols-2">
              <button
                v-for="t in tiles"
                :key="t.id"
                type="button"
                :aria-pressed="first === t.id"
                class="flex items-center gap-3.5 rounded-lg border p-3.5 text-left transition-colors"
                :class="first === t.id ? 'border-brand-deep bg-brand-deep/[.05]' : 'border-border hover:border-brand-deep/50'"
                @click="first = t.id"
              >
                <span
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  :style="{ color: toneOf(t.id || 'none')[0], background: toneOf(t.id || 'none')[1] }"
                >
                  <AIcon :name="t.icon" cls="h-5 w-5" />
                </span>
                <span class="min-w-0 flex-1 text-[14px] font-extrabold" :class="{ 'text-brand-deep': first === t.id }">{{ t.name }}</span>
                <span v-if="first === t.id" class="shrink-0 text-brand-deep"><AIcon name="check" cls="h-5 w-5" /></span>
              </button>
            </div>
          </section>
        </div>

        <div :class="[dialogFoot, 'justify-between']">
          <p v-if="error" role="alert" class="w-full rounded-md bg-destructive/[.06] px-3 py-2 text-[13px] font-bold text-destructive">
            {{ error }}
          </p>
          <span class="min-w-0 flex-1 basis-56 text-[13.5px] text-secondary-foreground">{{ next }}</span>
          <span class="flex flex-wrap gap-3">
            <button type="button" :class="btnOutline" :disabled="busy" @click="close">Cancel</button>
            <button type="button" :disabled="!ok" :class="btnDeep" @click="create">Create experience</button>
          </span>
        </div>
      </div>
    </div>
  </Teleport>
</template>
