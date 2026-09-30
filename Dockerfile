# syntax=docker/dockerfile:1

# One image serving all five frontend applications as static files through nginx.
# Node is used only to build; the runtime image has no Node.
#
# Backend address: Vite bakes VITE_* values into the JavaScript at build time.
# Left empty (the default), every app calls /api and /socket.io on the domain it
# was loaded from, and the reverse proxy forwards those paths to the backend. The
# same image then works for staging and production. Passing absolute URLs as build
# arguments instead produces an image tied to one backend.

ARG NODE_IMAGE=node:22.23.3-trixie-slim
ARG NGINX_IMAGE=nginxinc/nginx-unprivileged:1.28.2-alpine

FROM ${NODE_IMAGE} AS build

ARG VITE_API_URL=""
ARG VITE_WS_URL=""
ARG VITE_API_BASE_URL=""
ARG VITE_FLOOR_MOCKS="0"
ENV VITE_API_URL=${VITE_API_URL} \
    VITE_WS_URL=${VITE_WS_URL} \
    VITE_API_BASE_URL=${VITE_API_BASE_URL} \
    VITE_FLOOR_MOCKS=${VITE_FLOOR_MOCKS}

WORKDIR /src
COPY . .

# `npm ci` installs exactly the root lockfile, which carries every platform's native
# build tools (lightningcss, rolldown, esbuild), so it builds on arm64 and amd64.
RUN --mount=type=cache,target=/root/.npm \
    npm ci --include=optional --no-audit --no-fund

RUN npm --workspace managerbeyo-app-managers run build \
    && npm --workspace managerbeyo-app-workers run build \
    && npm --workspace managerbeyo-app-sellers run build \
    && npm --workspace managerbeyo-app-floor run build \
    && npm --workspace managerbeyo-app-presentation-studio run build

# Gather the builds and precompress text assets so nginx can serve .gz directly.
RUN mkdir -p /out \
    && cp -r apps/managers-app/ManagerBeyo-app-managers/dist /out/managers \
    && cp -r apps/workers-app/ManagerBeyo-app-workers/dist /out/workers \
    && cp -r apps/selleres-app/ManagerBeyo-app-sellers/dist /out/sellers \
    && cp -r apps/floor-app/ManagerBeyo-app-floor/dist /out/floor \
    && cp -r apps/presentation-studio/ManagerBeyo-app-presentation-studio/dist /out/studio \
    && find /out -type f -size +1k \
       \( -name '*.js' -o -name '*.css' -o -name '*.html' -o -name '*.json' \
          -o -name '*.svg' -o -name '*.webmanifest' -o -name '*.txt' -o -name '*.ttf' \) \
       -exec gzip -k -9 {} +


# The nginx layer without the applications: configuration, entrypoint scripts and
# settings. Built on its own by docker/nginx/test/app-host.test.sh, which checks the
# routing without the Node build.
FROM ${NGINX_IMAGE} AS runtime-base

USER root
RUN rm -f /etc/nginx/conf.d/default.conf
COPY docker/nginx/conf.d/ /etc/nginx/conf.d/
COPY docker/nginx/snippets/ /etc/nginx/snippets/
COPY docker/nginx/templates/ /etc/nginx/templates/
COPY --chmod=0755 docker/nginx/entrypoint.d/25-real-ip.sh /docker-entrypoint.d/25-real-ip.sh
COPY --chmod=0755 docker/nginx/entrypoint.d/26-app-host.sh /docker-entrypoint.d/26-app-host.sh
RUN install -d -o nginx -g nginx /etc/nginx/generated

# Rendered into the nginx configuration at container start. The defaults suit local
# testing; deployments set their real hostnames.
#   *_HOST                 hostnames each server block answers on (several allowed)
#   API_UPSTREAM           the backend API service (host:port) on the internal network
#   REAL_IP_TRUSTED_CIDRS  load balancers allowed to report the client address; empty
#                          means this proxy is the edge (see 25-real-ip.sh)
#   SYSTEM_CONTROL_STUB    ready: answer /system/status and /system/wake as READY
#                          (staging, local); off: /system/* is a 404 (production,
#                          where the infrastructure answers it). See 26-app-host.sh
#   STATIC_APPS            on: serve the applications; off: application hostnames
#                          answer only /api, /socket.io and /system (production origin)
ENV API_HOST=api.localhost \
    MANAGERS_HOST=managers.localhost \
    WORKERS_HOST=workers.localhost \
    SELLERS_HOST=sellers.localhost \
    FLOOR_HOST=floor.localhost \
    STUDIO_HOST=studio.localhost \
    API_UPSTREAM=api:8000 \
    REAL_IP_TRUSTED_CIDRS="" \
    SYSTEM_CONTROL_STUB=off \
    STATIC_APPS=on \
    NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1 \
    NGINX_ENVSUBST_FILTER="^((API|MANAGERS|WORKERS|SELLERS|FLOOR|STUDIO)_HOST|API_UPSTREAM|NGINX_LOCAL_RESOLVERS)$"

USER nginx
EXPOSE 8080


FROM runtime-base

COPY --from=build /out/ /usr/share/nginx/apps/

ARG GIT_COMMIT=unknown
ARG BUILD_DATE=unknown
LABEL org.opencontainers.image.title="managerbeyo-frontend" \
      org.opencontainers.image.source="https://github.com/Loorenz-David/Manager-app-frontend" \
      org.opencontainers.image.revision="${GIT_COMMIT}" \
      org.opencontainers.image.created="${BUILD_DATE}"
