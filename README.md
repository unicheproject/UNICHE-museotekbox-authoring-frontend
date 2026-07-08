# Museotek Box Frontend

A **Vue 3 SPA** that authenticates against the shared UNICHE IdP (Keycloak) and drives the
**Museotek Box Backend** — the only backend this app talks to. It never calls the Catalogue
service directly; the backend proxies organisation/project/authorization data from Catalogue and
adds its own "companion row" bookkeeping on top (see the backend's own docs for the lazy-JIT
pattern).

This is a sibling repo to `museotek-box` (which contains the Spring Boot backend). Scaffolded from
`UNICHEportal`, another tool on the same platform, reusing its identity/authorization adapter and
UI conventions.

**v1 scope**: authentication, the authorization-context dashboard, and Experience (Catalogue
"project") management — create, edit, soft-delete. Organisation management, invitations, and
branding images are explicitly out of scope for this pass; see `museotek-box`'s plan notes for why.

## Architecture

```
Browser ── Vue SPA (public PKCE client) ──► UNICHE IdP (Keycloak)   (login, in-memory tokens, silent refresh)
                         └── Bearer (aud: uniche-platform) ──► Museotek Box Backend (the only backend)
                                                                    └──► Catalogue (server-to-server only)
```

No frontend-to-Catalogue calls. Tokens are held in memory (never localStorage). The backend
resolves authorization; the adapter caches `GET /me/authorization` (short TTL + ETag) and evaluates
the same platform rule locally via `can()` for UX gating — always re-enforced server-side.

## Run order (local dev)

```bash
npm install
npm run dev        # serves on port 5173 (HMR)
```

Requires the Museotek Box Backend running and reachable (default `http://localhost:8080`, context
path `/museotekbox`), and a Keycloak client `museotek-box-web` registered in the `uniche` realm at
`https://idp.uniche-eccch.eu`. For `npm run dev` (port 5173) the redirect URI is already registered
and confirmed working; for the Dockerised build (port 8083) it isn't yet — see DEPLOYMENT.md §2a
for the exact values and how to add them.

Open the app, sign in, and the Dashboard shows your profile and the authorization context resolved
by the backend: platform admins see `platform admin: yes`; everyone else sees their managed
organisations and experience memberships (authenticated ≠ authorized). The **Experiences** tab
lists every experience reachable across those organisations; managers of at least one organisation
(or platform admins) get a **New Experience** button, gated client-side by `can()` and
re-enforced by the backend/Catalogue.

**Editing & deleting.** An experience's detail page lets a manager-of-org (or admin) rename it or
soft-delete it (routed through the shared `ConfirmDialog`). The slug and tool are fixed. There is
no restore UI in v1 (the backend supports it; add a view when needed).

### All-in-one container

```bash
cp .env.example .env
docker compose up -d --build      # serves the built SPA on http://localhost:8083
```

Runtime config (`IDP_URL`, `BACKEND_URL`, realm, client id, audience) is injected into `/config.js`
at container start, so the **same image** works across environments without a rebuild. `IDP_URL`
must equal the issuer the Museotek Box Backend validates against.

## The reusable adapter (`src/platform/`)

- **`auth/`** — wraps `keycloak-js`: PKCE login/logout, in-memory token store, silent refresh, and
  a token accessor used by the axios bearer interceptor (`src/api/museotekBox.ts`).
- **`authz/`** — `can(ctx, action, ref)` (the platform rule, pure & unit-tested) and
  `AuthorizationCache` (short-TTL + ETag revalidation over `GET /me/authorization`).

Kept free of Vue-specific imports, copied verbatim from `UNICHEportal`.

## Tests

```bash
npm run test     # Vitest: can() rule (admin/manager/member/deny), the TTL/ETag cache, slugify
```

## Tech & pinning

Vue 3.5 + TS, Vite 6, Vue Router 4.5, Pinia 2.3, keycloak-js 26.1, axios 1.7; UI = shadcn-vue-style
components (built on reka-ui) + Tailwind 3.4. Exact versions in `package.json`; `package-lock.json`
should be committed once `npm install` has run; `engines.node` set. Docker images pinned by tag —
pin by `@sha256` digest too on first real build (see `docker/Dockerfile`).
