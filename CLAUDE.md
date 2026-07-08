# Museotek Box Frontend — CLAUDE.md

## What this is
A **Vue 3 SPA** and **public OIDC PKCE client** that talks to exactly one backend: the
**Museotek Box Backend**. It never calls the Catalogue service directly — the backend proxies
organisation/project/authorization data and layers its own local "companion row" bookkeeping on
top. Scaffolded from `UNICHEportal` (a sibling tool on the same UNICHE platform); reuses its
identity/authorization adapter almost verbatim.

## Hard rules (don't break these)
- **This frontend calls only the Museotek Box Backend.** Never add a direct call to the Catalogue
  service from this repo — if new data is needed from Catalogue, add a passthrough endpoint on the
  backend first.
- **Tokens live in memory only** — never `localStorage`/`sessionStorage`/cookies.
- **The backend is the source of truth for authorization.** `can()` is a *client-side mirror* of
  the platform rule for UX gating only; every action is re-enforced server-side. Never treat a
  client `can()` result as the authority.
- **Bearer audience is `uniche-platform`** — tokens are sent to the backend with this audience.
- **Keep `src/platform/` free of Vue-specific imports.** No `vue`, no Pinia, no router inside the
  adapter — it's designed to be reusable by other tools.
- **Terminology split**: code, API calls, and DTOs say "Project" (matches the backend/Catalogue
  vocabulary — `ProjectDto`, `listProjects`, `/organisations/{orgId}/projects`). All user-facing
  copy, route paths, and view file names say "Experience" (`/experiences`, `Experiences.vue`, "New
  Experience"). Don't rename the API layer to match the UI copy — that would diverge from the
  backend's own naming.
- **v1 scope is intentionally narrow**: authentication, the authorization dashboard, and experience
  create/edit/soft-delete. No organisation management screens, no invitations, no branding images.
  Don't add these without confirming scope first — they were deliberately deferred.
- **Version pinning is deliberate.** Exact versions in `package.json`; commit `package-lock.json`
  once generated.

## Layout
- `src/platform/auth/` — wraps `keycloak-js`: PKCE login/logout, in-memory token store, silent
  refresh, token accessor for the axios bearer interceptor.
- `src/platform/authz/` — `can(ctx, action, ref)` (pure platform rule, unit-tested) and
  `AuthorizationCache` (short-TTL + ETag revalidation over `GET /me/authorization`).
- `src/api/museotekBox.ts` — axios client + bearer interceptor; ALL backend calls go through here.
- `src/stores/` — Pinia: `auth.ts` (session) and `authz.ts` (authorization context).
- `src/views/` — pages: `Login.vue`, `Dashboard.vue`, `Experiences.vue`, `CreateExperience.vue`,
  `ExperienceDetail.vue`.
- `src/router/index.ts` — flat routes + guard (`createAppRouter()` factory, created only after
  `main.ts` runs `authStore.bootstrap()` — do not call it eagerly at module load).
- `src/components/ui/` — shadcn-vue-style components built on reka-ui; **source is committed**, not
  a runtime dep. `ui/dialog/ConfirmDialog.vue` is the reusable confirm dialog — route every
  destructive action through it (`v-model:open`, `@confirm`).
- `src/lib/useOrgNames.ts` — composable resolving organisation ids to display names (there is no
  org-browsing screen, so this is the only way names get resolved).
- `src/config.ts` — reads runtime config injected into `/config.js` at container start.

## Commands
```bash
npm install
npm run dev        # Vite dev server, HMR, port 5173
npm run build      # vue-tsc type-check (--noEmit) then vite build
npm run test        # Vitest: can() rule + cache TTL/ETag + slugify
npm run test:watch
```
Requires the Museotek Box Backend running and reachable, and a Keycloak client `museotek-box-web`
registered in the `uniche` realm at `https://idp.uniche-eccch.eu` — see DEPLOYMENT.md §2a for the
exact local-dev redirect URIs / web origins per port.

## Runtime config
Browser-facing values (`IDP_URL`, `BACKEND_URL`, `REALM`, `CLIENT_ID`, `AUDIENCE`) are injected
into `/config.js` at container start, so the **same image** works across environments without a
rebuild. `IDP_URL` must equal the issuer the Museotek Box Backend validates against. See
`.env.example` and `DEPLOYMENT.md`.

## Tech
Vue 3.5 + TS, Vite 6, Vue Router 4.5, Pinia 2.3, keycloak-js 26.1, axios 1.7, Tailwind 3.4,
reka-ui. Node `>=22.13.0 <23`.
