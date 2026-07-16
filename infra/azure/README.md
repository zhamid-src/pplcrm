# pplCRM Azure infrastructure (Bicep)

Per-region data + compute plane, parameterized by region so US/EU are a param change rather than a
manual re-walk of `deploy/PROD-CHECKLIST.md`. Region 1 (Canada Central) was stood up by hand first;
this template mirrors those exact resources and is the reproducible path for regions 2+.

## What it provisions

- **PostgreSQL Flexible Server** (`pplcrm-pg-<regionCode>`, Burstable B1ms, PG 16)
- The **`pplcrm` database**
- The **`azure.extensions` allow-list** (`PG_TRGM,PGCRYPTO`) the schema baseline needs
- **Firewall rules**: Allow-Azure-Services (for the Container App) + optional admin client IP
- **Blob storage** account (`pplcrm<regionCode>storage`, Standard_LRS, no public access) + private `uploads` container

_WIP — the `pplcrm-api` Container App is appended when the checklist reaches §3._

## Deploy a region

```bash
# 1. Resource group for the region
az group create -n pplcrm-cad-prod -l canadacentral

# 2. Deploy (password passed on the CLI, never committed)
az deployment group create \
  -g pplcrm-cad-prod \
  -f infra/azure/main.bicep \
  -p infra/azure/canadacentral.bicepparam \
  -p pgAdminPassword='<admin password>' \
  -p adminClientIp="$(curl -s https://api.ipify.org)"
```

For a new region, copy `canadacentral.bicepparam` → e.g. `eastus.bicepparam`, change `location`,
`regionCode`, and drop the `pgServerName` pin (so it uses the `pplcrm-pg-<regionCode>` convention),
then deploy into that region's resource group.

## Not covered here (deliberately)

- **Global/shared** resources: Cloudflare DNS/TLS, GHCR images, Cloudflare Pages/Workers.
- **Multi-region tenant routing / residency** (which tenant hits which regional backend) — an
  unsolved _design_ task, tracked separately. Standing up more regions without it yields isolated
  backends with no routing between them.
