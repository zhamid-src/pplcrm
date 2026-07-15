# syntax=docker/dockerfile:1
#
# Edge image for pplCRM (the `pplcrm-edge` Azure Container App): Caddy serving the CRM + companion
# static SPAs and reverse-proxying /api and /d to the backend Container App. See deploy/Caddyfile.
#
# Build context is the repo root. dist/apps/frontend and dist/apps/companion must already be built
# (the CI `deploy.yml` runs `nx build` before this image build):
#   docker build -f deploy/Caddy.Dockerfile -t pplcrm-edge .
#
# TLS terminates upstream (Cloudflare + Container Apps ingress) — Caddy serves plain HTTP on :80,
# so set the Container App targetPort to 80. BACKEND_UPSTREAM must point at the pplcrm-api app.

FROM caddy:2-alpine

COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY dist/apps/frontend /srv/frontend
COPY dist/apps/companion /srv/companion

# Match the Caddyfile defaults; override BACKEND_UPSTREAM at deploy to the pplcrm-api internal FQDN.
ENV FRONTEND_ROOT=/srv/frontend \
    COMPANION_ROOT=/srv/companion

EXPOSE 80
