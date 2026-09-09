<script setup lang="ts">
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

/**
 * Shared body for the navigation sections whose backend does not exist yet (Library, Boxes,
 * Members). They are routable so the information architecture is settled and reviewable, but they
 * state plainly that there is nothing to show rather than faking data.
 * The endpoints they are waiting on are listed in docs/BACKEND-GAPS.md.
 */
defineProps<{
  title: string
  description: string
  /** The backend work this section is waiting on, in plain language. */
  waitingOn: string[]
}>()
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3">
      <h1 class="text-2xl font-bold">{{ title }}</h1>
      <Badge variant="warning">Coming soon</Badge>
    </div>

    <Card>
      <CardContent class="space-y-4 py-8">
        <p class="text-sm text-muted-foreground">{{ description }}</p>
        <div>
          <p class="text-xs font-bold uppercase tracking-overline text-muted-foreground">
            Waiting on the backend
          </p>
          <ul class="mt-2 space-y-1 text-sm">
            <li v-for="item in waitingOn" :key="item" class="flex gap-2">
              <span aria-hidden="true" class="text-muted-foreground">—</span>
              <span>{{ item }}</span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
