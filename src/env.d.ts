/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface MuseotekRuntimeConfig {
  IDP_URL: string
  REALM: string
  CLIENT_ID: string
  AUDIENCE: string
  BACKEND_URL: string
}

interface Window {
  __MUSEOTEK_CONFIG__?: MuseotekRuntimeConfig
}
