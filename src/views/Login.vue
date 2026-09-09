<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const authStore = useAuthStore()
const router = useRouter()

onMounted(() => {
  // If a silent-SSO session already exists, skip the login screen.
  if (authStore.authenticated) {
    router.replace('/')
  }
})
</script>

<template>
  <div class="w-full max-w-md">
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <p class="text-sm text-muted-foreground">
          Authenticate with the UNICHE IdP to access Museotek Box.
        </p>
        <Button class="w-full" @click="authStore.login('/')">Continue to UNICHE IdP</Button>
      </CardContent>
    </Card>
  </div>
</template>
