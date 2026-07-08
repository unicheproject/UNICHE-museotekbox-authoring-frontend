import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { createAppRouter } from './router'
import { useAuthStore } from './stores/auth'
import './assets/globals.css'

const app = createApp(App)
app.use(createPinia())

// Attempt silent SSO (and strip any leftover OIDC params from the URL) BEFORE creating the
// router. createWebHistory captures the URL at creation, so the router must be built only after
// bootstrap has cleaned it — otherwise Vue Router re-asserts the polluted URL on mount.
const authStore = useAuthStore()
authStore.bootstrap().finally(() => {
  app.use(createAppRouter())
  app.mount('#app')
})
