import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Dashboard from '@/views/Dashboard.vue'
import Login from '@/views/Login.vue'
import Experiences from '@/views/Experiences.vue'
import ExperienceDetail from '@/views/ExperienceDetail.vue'
import DeletedExperiences from '@/views/DeletedExperiences.vue'
import ScanObjects from '@/views/ScanObjects.vue'
import ScanObjectDetail from '@/views/ScanObjectDetail.vue'
import Boxes from '@/views/Boxes.vue'
import BoxDetail from '@/views/BoxDetail.vue'
import MembersSection from '@/views/MembersSection.vue'
import Account from '@/views/Account.vue'

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
      // project ids. 'new' is the list with the New experience dialog open over it.
      { path: '/experiences/new', name: 'experience-new', component: Experiences },
      { path: '/experiences/deleted', name: 'experiences-deleted', component: DeletedExperiences },
      { path: '/experiences/:projectId', name: 'experience', component: ExperienceDetail },
      // The same page with one step in the panel, or one of its dialogs open over the flow.
      { path: '/experiences/:projectId/step/:key', name: 'experience-step', component: ExperienceDetail },
      { path: '/experiences/:projectId/link/:key', name: 'experience-link', component: ExperienceDetail },
      { path: '/experiences/:projectId/add', name: 'experience-add', component: ExperienceDetail },
      { path: '/experiences/:projectId/test', name: 'experience-test', component: ExperienceDetail },
      { path: '/experiences/:projectId/publish', name: 'experience-publish', component: ExperienceDetail },
      { path: '/experiences/:projectId/advanced', name: 'experience-advanced', component: ExperienceDetail },
      // Scan objects and boxes are organisation-scoped on the backend, so the organisation is part
      // of the detail path: a shared or reopened link would otherwise not know where to look.
      { path: '/scan-objects', name: 'scan-objects', component: ScanObjects },
      {
        path: '/scan-objects/:orgId/:scanObjectId',
        name: 'scan-object',
        component: ScanObjectDetail,
      },
      { path: '/boxes', name: 'boxes', component: Boxes },
      { path: '/boxes/:orgId/:boxId', name: 'box', component: BoxDetail },
      { path: '/members', name: 'members', component: MembersSection },
      { path: '/account', name: 'account', component: Account },
    ],
  })

  // Guard: silent SSO is attempted once at startup (main.ts). If there is still no session, the
  // user lands on our own /login screen rather than being thrown straight at the IdP — the jump to
  // Keycloak happens only when they press the button there. The route they were heading for is
  // carried in ?redirect so the login can send them back to it.
  router.beforeEach((to) => {
    const authStore = useAuthStore()
    if (to.meta.public) {
      return true
    }
    if (!authStore.authenticated) {
      return { name: 'login', query: to.fullPath === '/' ? {} : { redirect: to.fullPath } }
    }
    return true
  })

  return router
}
