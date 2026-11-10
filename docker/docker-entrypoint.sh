#!/bin/sh
# Writes /config.js from the environment at container start, so one image serves every
# environment. Runs from /docker-entrypoint.d/; the nginx base image then starts nginx itself
# (do not exec nginx here).
#
# Fails the start on a missing or malformed value instead of serving a broken config. The values
# are written into a JavaScript string literal, so only the characters a URL origin or an
# identifier needs are accepted: no quotes, backslashes, spaces, newlines or angle brackets.
set -eu

CONFIG_FILE=/usr/share/nginx/html/config.js

fail() {
  echo "[museotek] $1" >&2
  exit 1
}

# Origin only (scheme, host, optional port): the SPA appends /museotekbox/api/v1 to BACKEND_URL,
# and keycloak-js appends /realms/<realm> to IDP_URL.
require_origin() {
  name=$1
  value=$2
  [ -n "$value" ] || fail "$name is required"
  case $value in
    *[!A-Za-z0-9.:/-]*) fail "$name contains characters not allowed in an origin: $value" ;;
  esac
  printf '%s' "$value" | grep -Eq '^https?://[A-Za-z0-9.-]+(:[0-9]{1,5})?$' \
    || fail "$name must be an origin like https://host or http://host:port, without a path or trailing slash: $value"
}

require_id() {
  name=$1
  value=$2
  [ -n "$value" ] || fail "$name is required"
  case $value in
    *[!A-Za-z0-9._-]*) fail "$name may contain only letters, digits, '.', '_' and '-': $value" ;;
  esac
}

# Environment-specific values have no default: a wrong default would fail later, in the browser.
IDP_URL=${IDP_URL:-}
BACKEND_URL=${BACKEND_URL:-}
REALM=${REALM:-uniche}
CLIENT_ID=${CLIENT_ID:-museotek-box-web}
AUDIENCE=${AUDIENCE:-uniche-platform}

require_origin IDP_URL "$IDP_URL"
require_origin BACKEND_URL "$BACKEND_URL"
require_id REALM "$REALM"
require_id CLIENT_ID "$CLIENT_ID"
require_id AUDIENCE "$AUDIENCE"

cat > "$CONFIG_FILE" <<EOF
window.__MUSEOTEK_CONFIG__ = {
  IDP_URL: "$IDP_URL",
  REALM: "$REALM",
  CLIENT_ID: "$CLIENT_ID",
  AUDIENCE: "$AUDIENCE",
  BACKEND_URL: "$BACKEND_URL"
};
EOF

echo "[museotek] wrote $CONFIG_FILE: IDP_URL=$IDP_URL REALM=$REALM CLIENT_ID=$CLIENT_ID BACKEND_URL=$BACKEND_URL"
