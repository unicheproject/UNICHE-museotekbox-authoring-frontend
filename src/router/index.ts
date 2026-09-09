import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Dashboard from '@/views/Dashboard.vue'
import Login from '@/views/Login.vue'
import Experiences from '@/views/Experiences.vue'
import CreateExperience from '@/views/CreateExperience.vue'
import ExperienceDetail from '@/views/ExperienceDetail.vue'
import DeletedExperiences from '@/views/DeletedExperiences.vue'

// IMPORTANT: created via a factory, not at module load. createWebHistory() captures the current
// URL at creation time; if the router were created while the post-login OIDC fragment
// (#state=…&code=…) is still present, Vue Router would re-assert that polluted URL on mount —
// even after we strip it. main.ts calls this only after auth bootstrap has cleaned the URL.
export function createAppRouter() {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/login', name: 'login', component: Login, meta: { public: true } },
      { path: '/', name: 'dashboard', component: Dashboard },
      { path: '/experiences', name: 'experiences', component: Experiences },
      // Must come before '/experiences/:projectId' so 'new' and 'deleted' are not captured as
      // project ids.
      { path: '/experiences/new', name: 'experience-new', component: CreateExperience },
      { path: '/experiences/deleted', name: 'experiences-deleted', component: DeletedExperiences },
      { path: '/experiences/:projectId', name: 'experience', component: ExperienceDetail },
    ],
  })

  // Guard: silent SSO is attempted once at startup (main.ts). If there is still no session,
  // non-public routes bounce the user to the IdP login.
  router.beforeEach((to) => {
    const authStore = useAuthStore()
    if (to.meta.public) {
      return true
    }
    if (!authStore.authenticated) {
      authStore.login(to.fullPath)
      return false
    }
    return true
  })

  return router
}
