<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

/**
 * Where to land after the IdP round-trip. The router guard puts the route the user was heading for
 * in ?redirect; anything that is not an in-app absolute path is ignored, so a crafted link cannot
 * turn the login into an open redirect.
 */
const redirectTo = computed(() => {
  const target = route.query.redirect
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')
    ? target
    : '/'
})

// The redirect to Keycloak is not instant, so the button reports that it is on its way rather than
// looking dead while the browser navigates away.
const leaving = ref(false)

function signIn() {
  leaving.value = true
  authStore.login(redirectTo.value)
}

onMounted(() => {
  // If a silent-SSO session already exists, skip the login screen.
  if (authStore.authenticated) {
    router.replace(redirectTo.value)
  }
})
</script>

<template>
  <div class="relative w-full max-w-lg">
    <!-- Background texture: a neutral dot grid, no colour of its own, so the gradient stays the
         only saturated thing on the screen. -->
    <div
      aria-hidden="true"
      class="pointer-events-none fixed inset-0 -z-10 opacity-[0.35] [background-image:radial-gradient(hsl(var(--border))_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]"
    />

    <div class="animate-login-in">
      <div class="mb-10 flex flex-col items-center gap-5 text-center">
        <img
          src="/museotekbox_mark.png"
          alt=""
          class="h-24 w-24 object-contain"
        />
        <div class="text-[44px] font-extrabold leading-none tracking-[0.02em] text-brand-deep">
          museotek<span class="bg-grad-brand bg-clip-text text-transparent">Box</span>
        </div>
      </div>

      <!-- Gradient hairline: a 1px brand-coloured edge drawn by letting the gradient show through
           around an inset white card, rather than a coloured border property. -->
      <div class="rounded-[18px] bg-grad-brand p-px">
        <Card class="overflow-hidden rounded-[17px] border-0 shadow-none">
          <div class="h-2 bg-grad-brand" />
          <CardContent class="relative px-12 pb-16 pt-16">
            <!-- Top highlight: a whisper of light across the card, the way a glossy surface catches
                 the light above the fold. -->
            <div
              aria-hidden="true"
              class="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/[0.025] to-transparent"
            />
            <Button
              variant="gradient"
              size="lg"
              class="relative w-full"
              :disabled="leaving"
              @click="signIn"
            >
              {{ leaving ? 'Signing in…' : 'Sign in' }}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* One quiet entrance, not an animation showcase: the card settles into place on first paint. */
@keyframes login-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.animate-login-in {
  animation: login-in 420ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

@media (prefers-reduced-motion: reduce) {
  .animate-login-in {
    animation: none;
  }
}
</style>
