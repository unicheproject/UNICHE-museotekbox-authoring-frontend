/** Runtime configuration, read from the injected window.__MUSEOTEK_CONFIG__ (see public/config.js). */
export interface MuseotekConfig {
  idpUrl: string
  realm: string
  clientId: string
  audience: string
  backendUrl: string
}

const injected = window.__MUSEOTEK_CONFIG__

export const config: MuseotekConfig = {
  idpUrl: injected?.IDP_URL ?? 'https://idp.uniche-eccch.eu',
  realm: injected?.REALM ?? 'uniche',
  clientId: injected?.CLIENT_ID ?? 'museotek-box-web',
  audience: injected?.AUDIENCE ?? 'uniche-platform',
  backendUrl: injected?.BACKEND_URL ?? 'http://localhost:8080',
}
