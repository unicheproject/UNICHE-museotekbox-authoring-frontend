<script setup lang="ts">
import { computed } from 'vue'
import { CalendarDays } from 'lucide-vue-next'
import { listMembers, type MemberDto } from '@/api/museotekBox'
import { useQuery } from '@/lib/useQuery'
import { useOrgScope } from '@/lib/useOrgScope'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'

const { orgId, orgOptions, showPicker, context } = useOrgScope()

const { data, pending, error } = useQuery(
  () => (orgId.value ? ['members', orgId.value] : null),
  () => listMembers(orgId.value),
)

const members = computed<MemberDto[]>(() => data.value ?? [])

/**
 * `userId` is null for someone with no IdP account yet, so identity falls back to the email: it is
 * what the backend keys those rows on, and it is stable enough for :key and for the avatar colour.
 */
function identity(member: MemberDto) {
  return member.userId ?? member.email ?? ''
}

/** The signed-in user is marked in the list rather than pulled out of it. */
function isSelf(member: MemberDto) {
  return member.userId !== null && member.userId === context.value?.subject
}

function displayName(member: MemberDto) {
  return member.displayName || member.email || identity(member) || 'Unknown'
}

function initial(member: MemberDto) {
  return displayName(member).trim().charAt(0).toUpperCase() || '—'
}

/**
 * Avatar colour is derived from the subject, not picked at random: the same person keeps the same
 * colour on every visit and on every screen that reuses this rule.
 */
const AVATAR_COLOURS = [
  'bg-blue-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-purple-600',
  'bg-rose-600',
  'bg-cyan-700',
  'bg-indigo-600',
  'bg-teal-600',
]

function avatarColour(member: MemberDto) {
  let hash = 0
  for (const char of identity(member)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return AVATAR_COLOURS[hash % AVATAR_COLOURS.length]
}

/** `since` is an ISO instant; only the day matters here. */
function joinedOn(since: string | null) {
  if (!since) return null
  const date = new Date(since)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Roles arrive as backend constants (e.g. ORG_MANAGER); shown in title case. */
function roleLabel(role: string | null) {
  if (!role) return null
  return role
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function roleVariant(role: string | null) {
  const value = role?.toUpperCase() ?? ''
  if (value.includes('MANAGER') || value.includes('ADMIN')) return 'purple' as const
  return 'neutral' as const
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">Members</h1>
        <p v-if="members.length" class="text-sm text-muted-foreground">
          {{ members.length }} {{ members.length === 1 ? 'member' : 'members' }}
        </p>
      </div>
      <Select v-if="showPicker" v-model="orgId" :options="orgOptions" class="w-56" aria-label="Organisation" />
    </div>

    <p v-if="pending" class="text-sm text-muted-foreground">Loading…</p>
    <p v-else-if="error" class="text-sm text-destructive">{{ error }}</p>
    <p v-else-if="!members.length" class="text-sm text-muted-foreground">No members yet.</p>

    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="member in members"
        :key="identity(member)"
        class="rounded-lg border border-border bg-card p-5 shadow-xs transition-shadow hover:shadow-sm"
      >
        <div class="flex items-start gap-3">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
            :class="avatarColour(member)"
            aria-hidden="true"
          >
            {{ initial(member) }}
          </div>
          <div class="min-w-0">
            <p class="truncate text-sm font-bold text-foreground">
              {{ displayName(member) }}
              <span v-if="isSelf(member)" class="text-xs font-medium text-muted-foreground">(you)</span>
            </p>
            <p v-if="member.email" class="truncate text-xs text-muted-foreground">{{ member.email }}</p>
          </div>
        </div>

        <p v-if="joinedOn(member.since)" class="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays class="h-3.5 w-3.5" />
          Member since {{ joinedOn(member.since) }}
        </p>

        <Badge v-if="roleLabel(member.role)" :variant="roleVariant(member.role)" class="mt-3">
          {{ roleLabel(member.role) }}
        </Badge>
      </div>
    </div>
  </div>
</template>
