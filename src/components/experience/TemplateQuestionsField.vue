<script setup lang="ts">
import { computed, ref } from 'vue'
import { Film, Image, Plus, Trash2, Type, X } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Select, type SelectOption } from '@/components/ui/select'
import {
  emptyQuestion,
  or,
  type ContentKind,
  type QuestionRow,
  type TemplateField,
} from '@/lib/experienceTemplates'

/**
 * Questions are edited the way scenes are in the editor: the list on the left, the one being
 * worked on beside it. Stacking them meant scrolling past every question that was not being
 * edited.
 *
 * Everything a question needs lives on the question itself — what the Display shows, the answers
 * the visitor can give with the card that stands for each, and which one is right.
 */
const props = defineProps<{
  field: Extract<TemplateField, { type: 'questions' }>
  questions: QuestionRow[]
  scanOptions: SelectOption[]
}>()

const selected = ref(0)

const index = computed(() => Math.min(selected.value, Math.max(0, props.questions.length - 1)))
const current = computed<QuestionRow | undefined>(() => props.questions[index.value])

/** A video can be given a card of its own, so the visitor plays it when they choose. */
const playOptions = computed<SelectOption[]>(() => [
  { value: '', label: 'Plays with the question' },
  ...props.scanOptions
    .filter((option) => option.value)
    .map((option) => ({ value: option.value, label: `Plays with ${option.label}` })),
])

const CONTENT_KINDS: { kind: ContentKind; label: string }[] = [
  { kind: 'TEXT', label: 'Text' },
  { kind: 'IMAGE', label: 'Image' },
  { kind: 'VIDEO', label: 'Video' },
]

const CONTENT_ICONS = { TEXT: Type, IMAGE: Image, VIDEO: Film }

function addQuestion() {
  props.questions.push(emptyQuestion())
  selected.value = props.questions.length - 1
}

function removeQuestion(at: number) {
  props.questions.splice(at, 1)
  selected.value = Math.max(0, selected.value - 1)
}

function addContent(question: QuestionRow, kind: ContentKind) {
  question.content.push({ type: kind, name: '', playCard: '' })
}

function addAnswer(question: QuestionRow) {
  question.answers.push({ label: '', card: '' })
}

function removeAnswer(question: QuestionRow, at: number) {
  question.answers.splice(at, 1)
  // The correct answer is an index into that list, so it has to move with it.
  if (question.correct === at) question.correct = -1
  else if (question.correct > at) question.correct -= 1
}
</script>

<template>
  <div>
    <div class="mb-2 flex items-center justify-between">
      <span class="label-overline text-muted-foreground">{{ field.label }}</span>
      <span class="text-[11px] text-muted-foreground">
        {{ questions.length }} question{{ questions.length === 1 ? '' : 's' }}
      </span>
    </div>

    <div class="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
      <!-- The questions, with a dot on the ones that cannot be answered yet. -->
      <div class="rounded-md border border-border bg-surface-2/60 p-2">
        <button
          v-for="(question, at) in questions"
          :key="at"
          type="button"
          class="flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left transition-colors"
          :class="at === index ? 'bg-card shadow-xs' : 'hover:bg-card/60'"
          @click="selected = at"
        >
          <span
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded-pill text-[11px] font-extrabold"
            :class="at === index ? 'bg-brand-deep text-white' : 'bg-card text-brand-deep'"
          >
            {{ at + 1 }}
          </span>
          <span class="min-w-0 flex-1">
            <span
              class="block truncate text-[12.5px] font-bold"
              :class="at === index ? 'text-brand-deep' : ''"
            >
              {{ or(question.name, `Question ${at + 1}`) }}
            </span>
            <span class="block text-[11px] text-muted-foreground">
              {{ question.answers.length }} answer{{ question.answers.length === 1 ? '' : 's' }}
            </span>
          </span>
          <span
            v-if="question.answers.length === 0 || question.correct < 0"
            class="h-2 w-2 shrink-0 rounded-pill bg-warning"
          />
        </button>

        <button
          type="button"
          class="mt-1 flex w-full items-center justify-center gap-1.5 rounded-sm border border-dashed border-input px-3 py-2 text-[12px] font-bold text-brand-deep transition-colors hover:border-brand-deep hover:bg-card"
          @click="addQuestion"
        >
          <Plus class="h-3.5 w-3.5" />
          Add question
        </button>
      </div>

      <div v-if="current" class="space-y-3">
        <div class="flex items-start gap-2">
          <Input
            v-model="current.name"
            placeholder="Question"
            class="h-9 text-[13px] font-extrabold"
          />
          <button
            type="button"
            title="Remove question"
            class="mt-1 rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-destructive"
            @click="removeQuestion(index)"
          >
            <Trash2 class="h-4 w-4" />
          </button>
        </div>

        <!-- What the Display shows: any number of text, image and video rows. -->
        <div class="space-y-1.5">
          <div
            v-for="(content, at) in current.content"
            :key="at"
            class="flex items-center gap-2 rounded-sm border border-border bg-card p-1.5"
          >
            <span
              class="w-16 shrink-0 rounded-sm bg-surface-2 py-1 text-center font-mono text-[10px] uppercase tracking-overline text-brand-deep"
            >
              {{ content.type }}
            </span>
            <Input
              v-model="content.name"
              :placeholder="content.type === 'TEXT' ? 'The text on the Display' : 'Choose a file'"
              class="h-8 flex-1 text-[12.5px]"
            />
            <Select
              v-if="content.type === 'VIDEO'"
              v-model="content.playCard"
              :options="playOptions"
              class="h-8 w-44 text-[12.5px]"
            />
            <button
              type="button"
              title="Remove"
              class="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-destructive"
              @click="current.content.splice(at, 1)"
            >
              <X class="h-3.5 w-3.5" />
            </button>
          </div>

          <div class="flex flex-wrap gap-2">
            <button
              v-for="kind in CONTENT_KINDS"
              :key="kind.kind"
              type="button"
              class="flex items-center gap-1.5 rounded-md border border-dashed border-input px-2.5 py-1.5 text-[11.5px] font-bold text-brand-deep transition-colors hover:border-brand-deep hover:bg-card"
              @click="addContent(current, kind.kind)"
            >
              <component :is="CONTENT_ICONS[kind.kind]" class="h-3 w-3" />
              {{ kind.label }}
            </button>
          </div>
        </div>

        <!-- The answers, and the card that stands for each. -->
        <div class="space-y-1.5 border-t border-border pt-3">
          <div
            v-if="current.answers.length"
            class="flex items-center gap-2 px-1.5 text-[10px] font-bold uppercase tracking-overline text-muted-foreground"
          >
            <span class="w-16 shrink-0 text-center">Correct</span>
            <span class="flex-1">Answer</span>
            <span class="w-40 shrink-0">Card for it</span>
            <span class="w-6 shrink-0" />
          </div>

          <div
            v-for="(answer, at) in current.answers"
            :key="at"
            class="flex items-center gap-2 rounded-sm border border-border bg-card p-1.5"
          >
            <label class="flex w-16 shrink-0 items-center justify-center">
              <input
                type="radio"
                :name="`correct-${index}`"
                :checked="at === current.correct"
                class="h-4 w-4 accent-success"
                @change="current.correct = at"
              />
              <span class="sr-only">Correct answer</span>
            </label>
            <Input v-model="answer.label" placeholder="e.g. Yes" class="h-8 flex-1 text-[12.5px]" />
            <Select v-model="answer.card" :options="scanOptions" class="h-8 w-40 text-[12.5px]" />
            <button
              type="button"
              title="Remove answer"
              class="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-destructive"
              @click="removeAnswer(current, at)"
            >
              <X class="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            type="button"
            class="flex items-center gap-1.5 rounded-md border border-dashed border-input px-2.5 py-1.5 text-[11.5px] font-bold text-brand-deep transition-colors hover:border-brand-deep hover:bg-card"
            @click="addAnswer(current)"
          >
            <Plus class="h-3 w-3" />
            Add answer
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
