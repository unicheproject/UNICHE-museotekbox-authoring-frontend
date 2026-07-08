# Deploying the Museotek Box Frontend to a staging VM

A static Vue SPA served by nginx inside the container — a public PKCE OIDC client with **no
backend of its own** and **no secrets**. It runs from this repo's `docker compose`, **behind your
external nginx** (which terminates TLS). The container's own nginx handles SPA history-fallback
and serves a runtime `/config.js`; your proxy just forwards to it.

Replace the example hosts with your real DNS names.

---

## 0. Prerequisites

- Docker Engine + Compose v2; `docker network create museotek-box` (compose declares it `external`)
  if this frontend and the Museotek Box Backend share a docker network on this host.
- DNS + TLS at nginx for the frontend host.
- The Museotek Box Backend must already be deployed and reachable.
- The `museotek-box-web` client must already exist in the `uniche` realm at
  `https://idp.uniche-eccch.eu`.

---

## 1. Configuration to change from dev → staging — `.env`

Copy `.env.example`, then set. These are all **browser-facing URLs/ids** (no secrets); they are
injected into `/config.js` at container start, so the same image works in any environment.

```dotenv
# Bind the published port to loopback so only nginx (same VM) reaches it.
FRONTEND_PORT=127.0.0.1:8083

# IdP issuer BASE (no /realms/...). Must match the host the backend validates against.
IDP_URL=https://idp.uniche-eccch.eu
REALM=uniche
CLIENT_ID=museotek-box-web
AUDIENCE=uniche-platform

# Museotek Box Backend base URL as the BROWSER reaches it (public).
BACKEND_URL=https://api.museotek-box-staging.example.org
```

No `docker-compose.override.yml` is needed — every staging value is read from `.env`.

---

## 2. The IdP realm must allow this origin (one-time)

The `museotek-box-web` client in the realm ships with `localhost`-only redirect URIs / web origins
(if it was only ever tested locally), and the realm's CSP `frame-ancestors` may list only dev
origins (used by the silent-SSO iframe). Add the staging frontend URL to **both**, via the IdP
admin console:

- `museotek-box-web` → Valid redirect URIs: `https://museotek-box-staging.example.org/*`
- `museotek-box-web` → Web origins: `https://museotek-box-staging.example.org`
- Realm Settings → Security Defenses → CSP `frame-ancestors`: add
  `https://museotek-box-staging.example.org`

Without these, the login redirect and the silent-SSO check are rejected by Keycloak.

### 2a. Local dev: the IdP realm must allow these origins too

The `museotek-box-web` client's origin allowlist is per-origin, not per-app — each local port you
serve this SPA from needs its own entry, same as the staging URL above. Currently in the
production realm:

- `http://localhost:5173/*` (Vite dev server, `npm run dev`) — **registered, confirmed working**
- `http://localhost:8083/*` (Docker Compose default, `FRONTEND_PORT=8083`) — **not yet registered**;
  add it (and the matching web origin `http://localhost:8083`) only if you need to test login via
  the containerised build rather than `npm run dev`

This is exactly what "Invalid parameter: redirect_uri" means if you hit it locally: the origin
you're serving from isn't in the client's allowlist yet. Add both the redirect URI and the web
origin for whichever port you're using, via the same IdP admin console flow as §2.

---

## 3. nginx vhost (your proxy — not in this repo)

The container already does SPA history-fallback internally, so a plain proxy_pass is enough:

```nginx
server {
  listen 443 ssl;
  server_name museotek-box-staging.example.org;
  ssl_certificate     /etc/letsencrypt/live/museotek-box-staging.example.org/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/museotek-box-staging.example.org/privkey.pem;

  location / {
    proxy_pass http://127.0.0.1:8083;
    proxy_set_header Host              $host;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

---

## 4. Deploy

```bash
cp .env.example .env                  # then edit it
docker network create museotek-box    # once per VM, only if sharing a network with the backend
docker compose up -d --build
# verify the injected config:
curl -s https://museotek-box-staging.example.org/config.js
```

(For repeatable deploys, build in CI → registry, and replace `build:` with `image:`. The same image
is reconfigured per environment via the `.env` values above — no rebuild needed to change URLs.)

### Smoke test
Open `https://museotek-box-staging.example.org`, sign in as a realm user. The Dashboard loading and
showing your authorization context proves the whole chain lines up: login → token with
`aud: uniche-platform` → the backend accepts it (issuer + audience + CORS) → context rendered.

---

## 5. Troubleshooting

- **Login fails with a redirect/origin error** → the realm `museotek-box-web` client is missing
  the staging redirect URI / web origin (§2).
- **Dashboard loads but API calls fail (CORS)** → the Museotek Box Backend's allowed-origins config
  is missing this frontend's exact origin.
- **Tokens rejected (401) right after login** → `IDP_URL` here and the backend's
  `IDP_ISSUER_URI` don't resolve to the same issuer string (issuer-consistency rule).
- Tokens are held in memory only (never localStorage); there are no secrets in this image.
