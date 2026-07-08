#!/bin/sh
# Regenerate /config.js from environment at container start, so ONE image works across
# environments without a rebuild. Placed in /docker-entrypoint.d/ — the nginx base image runs
# these scripts and then starts nginx itself (do not exec nginx here).
set -e

cat > /usr/share/nginx/html/config.js <<EOF
window.__MUSEOTEK_CONFIG__ = {
  IDP_URL: "${IDP_URL:-https://idp.uniche-eccch.eu}",
  REALM: "${REALM:-uniche}",
  CLIENT_ID: "${CLIENT_ID:-museotek-box-web}",
  AUDIENCE: "${AUDIENCE:-uniche-platform}",
  BACKEND_URL: "${BACKEND_URL:-http://localhost:8080}"
};
EOF

echo "[museotek] wrote runtime config: IDP_URL=${IDP_URL:-https://idp.uniche-eccch.eu} BACKEND_URL=${BACKEND_URL:-http://localhost:8080}"
