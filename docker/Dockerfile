# Museotek Box Frontend — build the SPA, serve it with nginx.
#
# Base images pinned by tag only for now — pin by @sha256 digest too on the first real build
# (e.g. `docker buildx imagetools inspect node:22.13-alpine`) and update this comment.
#   node:22.13-alpine
#   nginx:1.27-alpine
FROM node:22.13-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Injects /config.js from env before nginx starts (base image runs /docker-entrypoint.d/*.sh).
COPY docker/docker-entrypoint.sh /docker-entrypoint.d/99-museotek-config.sh
RUN chmod +x /docker-entrypoint.d/99-museotek-config.sh
EXPOSE 80
