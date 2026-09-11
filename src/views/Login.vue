<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MonitorPlay, Package, ScanLine, Layers } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'

/**
 * The public face of museotekBox, and the way into it.
 *
 * Signing in is not this app's own: museotekBox is one tool on the UNICHE platform, so someone
 * already signed in to UNICHE lands past this screen entirely (the silent-SSO check below), and
 * everyone else is sent to the UNICHE Keycloak and returned here. That makes this page a landing
 * page with one action rather than a login form — there are no credentials to collect.
 *
 * The wording of the sections below is taken from the MuseotekBox specification rather than
 * written for the page.
 */
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
  // If a silent-SSO session already exists, skip the landing page.
  if (authStore.authenticated) {
    router.replace(redirectTo.value)
  }
})

const features = [
  {
    icon: Layers,
    title: 'Experiences',
    text: 'An interactive visitor journey composed of connected Scenes, arranged in sequence or through branching paths.',
  },
  {
    icon: ScanLine,
    title: 'Scan objects',
    text: 'RFID-enabled cards, 3D-printed replicas and other physical items the Box recognises by their Scan Type.',
  },
  {
    icon: Package,
    title: 'Boxes',
    text: 'A Raspberry Pi-based device with an RFID reader, a small LCD screen and speakers. Experiences publish to it over the air.',
  },
  {
    icon: MonitorPlay,
    title: 'Emulator',
    text: 'Preview and test an Experience before publishing it to physical hardware, using the same Rule model it will run.',
  },
]
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background">
    <!-- The logo carries a black drop shadow, so the bar it sits in stays white. -->
    <header
      class="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-sm"
    >
      <div class="mx-auto flex h-16 w-full max-w-[1180px] items-center gap-2.5 px-6">
        <img src="/museotekbox_logo_no_background.png" alt="" class="h-9 w-9 object-contain" />
        <span class="text-[17px] font-extrabold tracking-[0.02em] text-brand-deep">
          Museotek<span class="bg-grad-brand bg-clip-text text-transparent">Box</span>
        </span>
        <Button class="ml-auto" size="sm" :disabled="leaving" @click="signIn">
          {{ leaving ? 'Signing in…' : 'Sign in' }}
        </Button>
      </div>
    </header>

    <main class="flex-1">
      <!-- Hero: the styleguide's deep-violet band, with its soft decorative gradient (the lighter
           #ff80b5 → #9089fc pair at low opacity), never the full brand gradient. -->
      <section class="relative overflow-hidden bg-brand-deep">
        <div
          aria-hidden="true"
          class="pointer-events-none absolute -right-40 -top-40 h-[560px] w-[560px] rounded-full bg-grad-deco opacity-40 blur-3xl"
        />
        <div
          aria-hidden="true"
          class="pointer-events-none absolute -bottom-52 -left-40 h-[420px] w-[420px] rounded-full bg-grad-deco opacity-25 blur-3xl"
        />

        <div
          class="relative mx-auto grid w-full max-w-[1180px] items-center gap-12 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-24"
        >
          <div>
            <h1
              class="text-[38px] font-extrabold leading-[1.08] tracking-[-0.025em] text-white sm:text-[46px]"
            >
              Interactive experiences for museums and cultural institutions.
            </h1>

            <p class="mt-6 max-w-[560px] text-base leading-relaxed text-white/70">
              museotekBox connects physical objects and interactions with digital multimedia
              content, so organisations can create, test and publish visitor experiences to their
              own hardware.
            </p>

            <div class="mt-10">
              <Button variant="gradient" size="lg" :disabled="leaving" @click="signIn">
                {{ leaving ? 'Signing in…' : 'Sign in' }}
              </Button>
            </div>
          </div>

          <!-- The mark sits on its own white panel: its drop shadow is solid black and would read
               as a smudge directly on the violet. -->
          <div class="hidden lg:flex lg:justify-end">
            <div
              class="flex h-[340px] w-[340px] items-center justify-center rounded-[28px] bg-white shadow-lg"
            >
              <img
                src="/museotekbox_logo_no_background.png"
                alt=""
                class="h-[200px] w-[200px] object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      <section class="mx-auto w-full max-w-[1180px] px-6 py-20">
        <h2 class="max-w-[680px] text-[26px] font-extrabold tracking-[-0.02em] text-foreground">
          A web-based CMS, a server, one or more physical Boxes, and an optional external Display.
        </h2>

        <div class="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <article
            v-for="feature in features"
            :key="feature.title"
            class="rounded-lg border border-border bg-card p-6 shadow-xs transition-shadow hover:shadow-md"
          >
            <span
              class="mb-5 flex h-11 w-11 items-center justify-center rounded-md bg-brand-deep/[0.08] text-brand-deep"
            >
              <component :is="feature.icon" class="h-5 w-5" />
            </span>
            <h2 class="text-base font-bold text-foreground">{{ feature.title }}</h2>
            <p class="mt-2 text-[13px] leading-relaxed text-muted-foreground">{{ feature.text }}</p>
          </article>
        </div>
      </section>
    </main>

    <footer class="bg-surface-dark">
      <div
        class="mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-4 px-6 py-8"
      >
        <span class="text-[15px] font-extrabold tracking-[0.02em] text-white">
          Museotek<span class="bg-grad-brand bg-clip-text text-transparent">Box</span>
        </span>
        <span class="text-xs text-white/45">A UNICHE platform tool</span>
      </div>
    </footer>
  </div>
</template>
