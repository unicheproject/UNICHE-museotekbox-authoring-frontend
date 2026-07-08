// DEV runtime config. In a container this file is regenerated from env at startup
// (see docker/docker-entrypoint.sh) so the SAME image works across environments.
// IDP_URL must equal the issuer the Museotek Box Backend validates against (issuer-consistency rule).
window.__MUSEOTEK_CONFIG__ = {
  IDP_URL: 'https://idp.uniche-eccch.eu',
  REALM: 'uniche',
  CLIENT_ID: 'museotek-box-web',
  AUDIENCE: 'uniche-platform',
  BACKEND_URL: 'http://localhost:8080',
}
