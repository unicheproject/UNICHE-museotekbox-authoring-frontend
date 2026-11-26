<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LogIn } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import BoxScene from '@/components/login/BoxScene.vue'

/**
 * The public face of museotekBox, and the way into it.
 *
 * Signing in is not this app's own: museotekBox is one tool on the UNICHE platform, so someone
 * already signed in to UNICHE lands past this screen entirely (the silent-SSO check below), and
 * everyone else is sent to the UNICHE Keycloak and returned here. That makes this page a landing
 * page with one action rather than a login form — there are no credentials to collect.
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
</script>

<template>
  <div class="page relative flex min-h-screen flex-col overflow-hidden">
    <!-- The flyer's circuit lines: two short groups that start at the page edge and end in a dot. -->
    <svg class="lines left" viewBox="0 0 240 90" aria-hidden="true">
      <path d="M0 20H120l24 24h60" /><circle cx="204" cy="44" r="3" />
      <path d="M0 70H150" /><circle cx="150" cy="70" r="3" />
    </svg>
    <svg class="lines right" viewBox="0 0 240 90" aria-hidden="true">
      <path d="M240 20H130l-24 24H46" /><circle cx="46" cy="44" r="3" />
      <path d="M240 70H100" /><circle cx="100" cy="70" r="3" />
    </svg>

    <!-- One centred width for the logos, the text, the picture and the footer. -->
    <!-- Platform │ tool, as the Portal's wordmark: one 1×24px line, #d1d5db, 12px either side. -->
    <header class="wrap blend flex min-h-[3.75rem] items-center gap-3 min-[900px]:min-h-[4.5rem]">
      <img
        src="/uniche-logo-wordmark.jpg"
        alt="UNICHE"
        width="492"
        height="96"
        class="block h-5 w-auto mix-blend-multiply min-[900px]:h-[1.625rem]"
      />
      <span aria-hidden="true" class="h-6 w-px flex-none bg-[#d1d5db]" />
      <img
        src="/museotekbox-logo.svg"
        alt="Museotek Box"
        width="300"
        height="55"
        class="block h-6 w-auto min-[900px]:h-9"
      />
    </header>

    <main
      class="wrap grid flex-1 grid-cols-1 items-center gap-8 pb-6 pt-4 min-[900px]:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] min-[900px]:gap-16 min-[900px]:pb-12 min-[900px]:pt-8"
    >
      <section>
        <h1
          class="text-[clamp(1.75rem,1.4rem+1vw,2.25rem)] font-bold leading-[1.2] tracking-[-0.02em] text-foreground"
        >
          Sign in to Museotek Box
        </h1>
        <p class="mb-8 mt-3.5 max-w-[26rem] text-base leading-relaxed text-[#374151]">
          Create the experiences your Boxes play: steps, quizzes, sound and video, started by the
          cards and objects visitors scan.
        </p>

        <!-- The app's main button ("New experience"): `.btn-grad`, extrabold capitals. -->
        <button
          type="button"
          class="sign-in btn-grad inline-flex min-h-12 w-full items-center justify-center gap-2.5 px-7 text-[13px] font-extrabold uppercase tracking-button shadow-md transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-cta-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-brand-deep disabled:cursor-progress disabled:hover:translate-y-0 min-[900px]:max-w-[22rem]"
          :disabled="leaving"
          :aria-busy="leaving"
          @click="signIn"
        >
          <LogIn class="h-[1.1rem] w-[1.1rem]" aria-hidden="true" />
          {{ leaving ? 'Signing in…' : 'Sign in' }}
        </button>
        <p class="mt-3 text-[13px] text-[#5b6472]">with your UNICHE account</p>
      </section>

      <BoxScene />
    </main>

    <footer class="wrap pb-6 pt-5 text-xs text-[#5b6472]">
      A tool of the UNICHE platform · created by Museotek
    </footer>
  </div>
</template>

<style scoped>
.page {
  background: linear-gradient(180deg, #f1f6f6 0%, #f7f8f8 55%, #faf4f7 100%);
}
.wrap {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 1200px;
  margin-inline: auto;
  padding-inline: 1rem;
}
@media (min-width: 900px) {
  .wrap {
    padding-inline: 2rem;
  }
}
/* No stacking context on the header, so the UNICHE JPEG's white ground multiplies into the page's
   tinted background instead of showing as a white box. */
.wrap.blend {
  z-index: auto;
}

.lines {
  position: absolute;
  z-index: 0;
  width: 9rem;
  pointer-events: none;
}
.lines path {
  fill: none;
  stroke: #dbe5e7;
  stroke-width: 1.2;
}
.lines circle {
  fill: #dbe5e7;
}
.lines.left {
  left: 0;
  bottom: 4rem;
}
.lines.right {
  right: 0;
  top: 4.5rem;
}
@media (min-width: 900px) {
  .lines {
    width: 15rem;
  }
  .lines.left {
    bottom: 9rem;
  }
  .lines.right {
    top: 7rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sign-in {
    transition: none;
  }
}
</style>
