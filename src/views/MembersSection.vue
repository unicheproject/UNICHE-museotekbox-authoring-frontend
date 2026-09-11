<script setup lang="ts">
import { computed } from 'vue'
import { CalendarDays, Users } from 'lucide-vue-next'
import { listMembers, type MemberDto } from '@/api/museotekBox'
import { useQuery } from '@/lib/useQuery'
import { useOrgScope } from '@/lib/useOrgScope'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Avatar } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'

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
  <div>
    <PageHeader title="Members">
      <template #actions>
        <Select
          v-if="showPicker"
          v-model="orgId"
          :options="orgOptions"
          class="w-56"
          aria-label="Organisation"
        />
      </template>
    </PageHeader>

    <p v-if="pending" class="text-sm text-muted-foreground">Loading…</p>
    <p v-else-if="error" class="text-sm text-destructive">{{ error }}</p>

    <Card v-else-if="!members.length">
      <EmptyState title="No members" :icon="Users" />
    </Card>

    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="member in members"
        :key="identity(member)"
        class="rounded-lg border border-border bg-card p-5 shadow-xs transition-shadow hover:shadow-sm"
      >
        <div class="flex items-start gap-3">
          <!-- The signed-in user is the one avatar in the accent violet, so they can find
               themselves in the grid without reading every name. -->
          <Avatar :initials="initial(member)" :variant="isSelf(member) ? 'purple' : 'deep'" />
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
