<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Check } from 'lucide-vue-next'
import { useAuthzStore } from '@/stores/authz'
import { createProject, listScanObjects } from '@/api/museotekBox'
import { useOrgNames } from '@/lib/useOrgNames'
import { useMutation, useQuery } from '@/lib/useQuery'
import { slugify } from '@/lib/slug'
import {
  EXPERIENCE_TEMPLATES,
  buildDocument,
  defaultConfig,
  findTemplate,
  isWideField,
  type TemplateConfig,
} from '@/lib/experienceTemplates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import type { SelectOption } from '@/components/ui/select'
import { Alert } from '@/components/ui/alert'
import { FormField } from '@/components/ui/form'
import TemplateCard from '@/components/experience/TemplateCard.vue'
import TemplateFieldControl from '@/components/experience/TemplateFieldControl.vue'
import TemplateIcon from '@/components/experience/TemplateIcon.vue'
import StepReview from '@/components/experience/StepReview.vue'

/**
 * The New Experience wizard: what you are making, which pattern it follows, the handful of plain
 * questions that pattern needs answered, and what all of that will create.
 *
 * The backend stores the experience itself and nothing else yet — there is no endpoint for scenes
 * and rules — so the document the review draws is built and kept on the client.
 */
const STEPS = ['Details', 'Template', 'Set it up', 'Review']

const router = useRouter()
const authzStore = useAuthzStore()
const { context } = storeToRefs(authzStore)
const { names: orgNames, resolve: resolveOrgNames } = useOrgNames()

const step = ref(1)

const managedOrgIds = computed(() => context.value?.managedOrganisations ?? [])
const canCreate = computed(() => managedOrgIds.value.length > 0)

/**
 * The author is not asked which organisation the experience belongs to — it is the one they
 * manage. The id is still needed for every call the wizard makes, so it is taken from the
 * authorization context as soon as that arrives.
 */
const orgId = ref('')
const name = ref('')

const templateId = ref<string | null>(null)
const config = ref<TemplateConfig>({})
const template = computed(() => findTemplate(templateId.value))

/**
 * The Catalogue needs a slug, the author is never asked for one: it is derived from the name. A
 * name written in Greek slugifies to nothing, so those fall back to a generated handle rather than
 * failing the create.
 */
const slug = computed(() => slugify(name.value) || `experience-${Date.now().toString(36)}`)

/**
 * The cards and objects a rule can be bound to are the organisation's own scan objects — the
 * wizard offers exactly what the museum has registered, never a made-up list.
 */
const { data: scanObjects } = useQuery(
  () => (orgId.value ? ['scan-objects', orgId.value] : null),
  () => listScanObjects(orgId.value),
)

// "Not chosen yet" is a legitimate state all the way through: an unbound card is the normal
// mid-draft condition and blocks publishing, not authoring.
const scanOptions = computed<SelectOption[]>(() => [
  { value: '', label: 'Not chosen yet' },
  ...(scanObjects.value ?? []).map((object) => ({
    value: String(object.id),
    label: object.name,
  })),
])

// Creating changes the experiences list, so its cached queries are dropped on success.
const create = useMutation(createProject, { invalidates: ['projects'] })

onMounted(async () => {
  await authzStore.load()
  await resolveOrgNames(managedOrgIds.value)
  if (managedOrgIds.value.length) orgId.value = managedOrgIds.value[0]
})

const detailsComplete = computed(() => Boolean(name.value.trim() && orgId.value))
const blocked = computed(
  () => (step.value === 1 && !detailsComplete.value) || (step.value === 2 && !templateId.value),
)

const built = computed(() => buildDocument(templateId.value, config.value))

const organisationLabel = computed(() => orgNames.value[orgId.value] ?? orgId.value)

const settingsFields = computed(() => template.value?.fields.filter((f) => f.settings) ?? [])
const mainFields = computed(() => template.value?.fields.filter((f) => !f.settings) ?? [])

function pick(id: string) {
  // Picking a different pattern starts its questions from scratch; the old answers belonged to a
  // shape that no longer applies.
  if (templateId.value !== id) {
    templateId.value = id
    const picked = findTemplate(id)
    config.value = picked ? defaultConfig(picked) : {}
  }
  goTo(3)
}

function goTo(next: number) {
  step.value = Math.min(STEPS.length, Math.max(1, next))
  window.scrollTo({ top: 0 })
}

function next() {
  if (!blocked.value) goTo(step.value + 1)
}

async function submit() {
  const outcome = await create.mutate(orgId.value, { name: name.value, slug: slug.value })
  if (outcome.ok && outcome.data) router.push(`/experiences/${outcome.data.id}`)
}
</script>

<template>
  <div>
    <PageHeader title="New Experience" back-label="Experiences" back-to="/experiences" />

    <Card v-if="!canCreate">
      <EmptyState title="You don't manage any organisation" />
    </Card>

    <template v-else>
      <!-- Where you are, on every step. -->
      <ol class="mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2 shadow-xs">
        <li
          v-for="(label, index) in STEPS"
          :key="label"
          class="flex flex-1 items-center gap-2.5 rounded-md px-3 py-2"
          :class="index + 1 === step ? 'bg-brand-deep/[.08]' : ''"
        >
          <span
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded-pill text-[11px] font-extrabold"
            :class="
              index + 1 < step
                ? 'bg-success text-white'
                : index + 1 === step
                  ? 'bg-brand-deep text-white'
                  : 'bg-surface-2 text-muted-foreground'
            "
          >
            <Check v-if="index + 1 < step" class="h-3.5 w-3.5" />
            <template v-else>{{ index + 1 }}</template>
          </span>
          <span
            class="truncate text-[13px]"
            :class="
              index + 1 === step
                ? 'font-extrabold text-brand-deep'
                : index + 1 < step
                  ? 'font-bold text-foreground'
                  : 'font-semibold text-muted-foreground'
            "
          >
            {{ label }}
          </span>
        </li>
      </ol>

      <Alert v-if="create.error.value" variant="error" class="mb-4">{{ create.error.value }}</Alert>

      <!-- Step 1 — what are you making -->
      <div v-if="step === 1">
        <h2 class="mb-5 text-base font-extrabold">What are you making?</h2>
        <Card>
          <CardContent class="p-6">
            <FormField label="Name" required :error="create.fieldErrors.value.name">
              <template #default="{ id, invalid, describedBy }">
                <Input
                  :id="id"
                  v-model="name"
                  :invalid="invalid"
                  :aria-describedby="describedBy"
                  placeholder="e.g. Bronze Age Gallery"
                />
              </template>
            </FormField>
          </CardContent>
        </Card>
      </div>

      <!-- Step 2 — the pattern. Not the shape of the whole experience: what gets stamped first. -->
      <div v-else-if="step === 2">
        <div class="mb-5">
          <h2 class="text-base font-extrabold">How does your experience work?</h2>
          <p class="mt-1 max-w-2xl text-[13px] text-muted-foreground">
            Pick the pattern closest to what you have in mind. Everything it creates stays fully
            editable.
          </p>
        </div>
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <TemplateCard
            v-for="option in EXPERIENCE_TEMPLATES"
            :key="option.id"
            :template="option"
            :selected="templateId === option.id"
            @pick="pick(option.id)"
          />
        </div>
      </div>

      <!-- Step 3 — the plain questions the pattern needs answered -->
      <div v-else-if="step === 3 && template">
        <template v-if="!template.fields.length">
          <Card>
            <CardContent class="p-8 text-center">
              <p class="text-sm text-secondary-foreground">
                Nothing to set up — you will start with a single empty scene.
              </p>
            </CardContent>
          </Card>
        </template>

        <template v-else>
          <h2 class="mb-5 text-base font-extrabold">Set up your {{ template.name }}</h2>
          <Card>
            <CardContent class="p-6">
              <div class="flex items-center gap-3 border-b border-border pb-4">
                <span
                  class="flex h-9 w-9 items-center justify-center rounded-md bg-brand-deep/[.08] text-brand-deep"
                >
                  <TemplateIcon :name="template.icon" />
                </span>
                <div>
                  <h3 class="text-base font-extrabold leading-tight">{{ template.name }}</h3>
                  <p class="text-[12px] text-muted-foreground">{{ template.tagline }}</p>
                </div>
                <button
                  type="button"
                  class="ml-auto text-[12px] font-bold text-brand-deep hover:underline"
                  @click="goTo(2)"
                >
                  Change
                </button>
              </div>

              <div class="mt-5 space-y-6">
                <TemplateFieldControl
                  v-for="field in mainFields"
                  :key="field.key"
                  :field="field"
                  :config="config"
                  :scan-options="scanOptions"
                />
              </div>

              <!-- The dials of the pattern, kept apart from its substance. -->
              <div
                v-if="settingsFields.length"
                class="mt-6 grid gap-5 border-t border-border pt-5 sm:grid-cols-2"
              >
                <div
                  v-for="field in settingsFields"
                  :key="field.key"
                  :class="isWideField(field) ? 'sm:col-span-2' : ''"
                >
                  <TemplateFieldControl
                    :field="field"
                    :config="config"
                    :scan-options="scanOptions"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </template>
      </div>

      <!-- Step 4 — what all of it will create -->
      <StepReview
        v-else-if="step === 4 && template"
        :document="built"
        :template="template"
        :name="name"
        :organisation="organisationLabel"
        :objects="scanObjects ?? []"
        @edit="goTo(3)"
      />

      <!-- One action bar for every step, in the same place, with the same shape. Only the wording
           and whether Continue is allowed change between steps. -->
      <div
        class="mt-6 flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 shadow-xs"
      >
        <Button variant="outline" @click="step === 1 ? router.push('/experiences') : goTo(step - 1)">
          {{ step === 1 ? 'Cancel' : 'Back' }}
        </Button>
        <div class="flex items-center gap-3">
          <span class="hidden text-[12px] font-bold text-muted-foreground sm:block">
            Step {{ step }} of {{ STEPS.length }}
          </span>
          <Button
            v-if="step === STEPS.length"
            variant="gradient"
            :disabled="create.loading.value || !detailsComplete"
            @click="submit"
          >
            {{ create.loading.value ? 'Creating…' : 'Create experience' }}
          </Button>
          <Button v-else :disabled="blocked" @click="next">Continue</Button>
        </div>
      </div>
    </template>
  </div>
</template>
