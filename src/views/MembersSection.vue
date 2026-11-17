<script setup lang="ts">
import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Users } from 'lucide-vue-next'
import { listMembers, type MemberDto } from '@/api/museotekBox'
import { useQuery } from '@/lib/useQuery'
import { useOrgScope } from '@/lib/useOrgScope'
import { useOrgNames } from '@/lib/useOrgNames'
import { isSelfMember, memberName, memberRole, memberSince, memberSubline } from '@/lib/members'
import { canManageOrg } from '@/platform/authz'
import { useAuthStore } from '@/stores/auth'
import { Select } from '@/components/ui/select'
import { Avatar } from '@/components/ui/avatar'
import { Alert } from '@/components/ui/alert'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { cardGrid, headBtnOutline, pill, pillTone } from '@/components/experience/styles'
import ListHeader from '@/components/inventory/ListHeader.vue'

const { orgId, orgOptions, showPicker, context } = useOrgScope()
const { profile } = storeToRefs(useAuthStore())
const { names: orgNames, resolve: resolveOrgNames } = useOrgNames()
watch(orgId, (id) => id && resolveOrgNames([id]), { immediate: true })

/**
 * Only a manager of the organisation (or a platform admin) can read its members; anyone else would
 * get a 403, so for them nothing is asked and the page says why.
 */
const allowed = computed(() => canManageOrg(context.value, orgId.value))

const { data, pending, error, refresh } = useQuery(
  () => (orgId.value && allowed.value ? ['members', orgId.value] : null),
  () => listMembers(orgId.value),
)

const members = computed<MemberDto[]>(() => data.value ?? [])

const subtitle = computed(() => {
  const org = orgNames.value[orgId.value] ?? ''
  if (!allowed.value || !data.value) return org || undefined
  const n = members.value.length
  return `${org ? `${org} · ` : ''}${n} member${n === 1 ? '' : 's'}`
})

/** Rows have no stable id of their own: the email is what the backend keys them on. */
const key = (m: MemberDto) => m.email || m.userId || memberName(m)
const isSelf = (m: MemberDto) => isSelfMember(m, profile.value?.email)
const initial = (m: MemberDto) => memberName(m).trim().charAt(0).toUpperCase() || '—'
</script>

<template>
  <div>
    <ListHeader title="Members" :subtitle="subtitle">
      <template #actions>
        <Select v-if="showPicker" v-model="orgId" :options="orgOptions" class="w-56" aria-label="Organisation" />
      </template>
    </ListHeader>

    <Card v-if="context && orgId && !allowed">
      <EmptyState
        title="Only organisation managers can see the member list"
        description="Ask your organisation manager if you need to know who is in the team."
        :icon="Users"
      />
    </Card>

    <Alert v-else-if="error" variant="error" title="Couldn't load the members">
      {{ error }}
      <button type="button" :class="[headBtnOutline, 'mt-3']" @click="refresh()">Try again</button>
    </Alert>

    <div v-else-if="pending" :class="cardGrid">
      <div v-for="n in 3" :key="n" class="rounded-lg border border-border bg-white p-5 shadow-xs">
        <div class="flex items-center gap-3">
          <Skeleton class="h-10 w-10 rounded-full" />
          <div class="space-y-2">
            <Skeleton class="h-4 w-32" />
            <Skeleton class="h-3 w-40" />
          </div>
        </div>
        <Skeleton class="mt-5 h-4 w-28" />
      </div>
    </div>

    <Card v-else-if="!members.length">
      <EmptyState title="No members" :icon="Users" />
    </Card>

    <!-- The same white box as the cards of the other lists: who, then a footer with the role and its date. -->
    <template v-else>
      <div :class="cardGrid">
        <div v-for="m in members" :key="key(m)" class="flex flex-col rounded-lg border border-border bg-white shadow-xs">
          <div class="flex items-center gap-3 px-4 pb-4 pt-4">
            <!-- The signed-in user is the one avatar in the accent violet, so they can find themselves. -->
            <Avatar :initials="initial(m)" :variant="isSelf(m) ? 'purple' : 'deep'" />
            <div class="min-w-0">
              <p class="truncate text-[15px] font-extrabold">
                {{ memberName(m) }}
                <span v-if="isSelf(m)" class="text-[12.5px] font-semibold text-muted-foreground">(you)</span>
              </p>
              <p v-if="memberSubline(m)" class="truncate text-[13px] text-muted-foreground">{{ memberSubline(m) }}</p>
            </div>
          </div>
          <div class="mx-4 mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border py-3">
            <span v-if="memberRole(m.role)" :class="[pill, m.role === 'MANAGER' ? pillTone.brand : pillTone.neutral]">{{ memberRole(m.role) }}</span>
            <span v-if="memberSince(m)" class="text-[12.5px] text-muted-foreground">{{ memberSince(m) }}</span>
          </div>
        </div>
      </div>
      <!-- Alone in the organisation: say how others arrive (invitations are made outside this tool). -->
      <p v-if="members.length === 1 && isSelf(members[0])" class="mt-4 text-[13px] text-muted-foreground">
        Only you so far. Curators appear here when they accept an invitation to an experience.
      </p>
    </template>
  </div>
</template>
