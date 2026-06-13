---
trigger: always_on
---

# 📁 PeopleCRM Repository Structure & Imports

This rules file defines the repository organization and import guidelines for the PeopleCRM project.

---

- **Monorepo Architecture (Nx)**: Keep logic separated:
  - `apps/frontend/` – Angular single-page application.
  - `apps/backend/` – Fastify 5 + tRPC backend.
  - `common/` – Shared types, database definitions, and Zod validation schemas.
- **Path Aliases**: Never use relative paths to cross boundary boundaries. Use TypeScript compiler aliases:
  - `@common` → Shared models & schemas.
  - `@uxcommon/*` → Frontend shared assets, components, and directives.
  - `@icons/*` → Icon components.
  - `@experiences/*` → Feature domains.
