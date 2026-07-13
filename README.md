# 🧱 pplCRM

**pplCRM** is a full‑stack campaign CRM built with Nx, Angular, Fastify, and PostgreSQL. It supports user management, authentication, and session tracking while emphasizing performance and modularity.

---

## 🧰 Tech Stack

| Layer         | Tools                                                   |
| ------------- | ------------------------------------------------------- |
| Frontend      | Angular 22, Tailwind CSS v4, DaisyUI v5, AG Grid        |
| Backend       | Fastify 5, tRPC, Kysely ORM, PostgreSQL                 |
| Auth          | JWT via `fast-jwt`, refresh tokens, session tracking    |
| Styling       | Tailwind CSS, DaisyUI, SCSS                             |
| Emails        | Postmark for transactional and Sendgrid for newsletters |
| Build Tooling | Nx Monorepo, Esbuild, SWC                               |
| Testing       | Jest (unit), Playwright (e2e)                           |

---

## 🗂️ Repository Structure

- `apps/backend/` – Fastify API server with controllers, repositories, migrations, and routers.
- `apps/frontend/` – Angular 22 SPA (standalone components & signals) styled with Tailwind CSS and DaisyUI.
- `common/` – Shared TypeScript/Zod definitions and Kysely database models.
- `docs/` – Project documentation including [Common UX Elements](docs/UX_COMMON.md) and [Feature Components](docs/COMPONENTS.md).
- Root configs (`package.json`, `nx.json`, `tsconfig.base.json`) define dependencies, build targets, and TypeScript settings.

---

## 🔧 Backend Highlights

- `main.ts` boots a `FastifyServer` instance (`fastify.server.ts`) that registers REST routes and mounts tRPC.
- Controllers (`controllers/`) host business logic; repositories (`repositories/`) implement CRUD with Kysely.
- Authentication uses `fast-jwt` for access/refresh tokens, `bcrypt` for password hashing, and session tracking.
- API is exposed via both tRPC routers and REST routes, organized by domain under `apps/backend/src/app/modules`.

---

## 🎨 Frontend Highlights

- Standalone Angular 22 components (`app.ts`, `app.routes.ts`) using signals and reactive forms.
- `services/api/` provides tRPC client setup, token storage, and search utilities.
- Feature modules in `components/` (persons, households, tags, etc.) with grids, detail pages, and services.
- Reusable UI elements live in `layout/` and `uxcommon/`, which now groups shared
  Angular pieces into `components/`, `directives/`, `pipes/`, and `services/`.

---

## 🏃 Daily Development

For day-to-day work, assuming you've already completed the first-time setup:

### 1. Start Background Services

Make sure Docker Desktop is running, then start your existing containers:

```bash
docker start pplcrm-db
docker start pplcrm-azurite
```

### 2. Run the Apps

Start the backend and frontend in two separate terminal windows:

**Terminal 1 (Backend):**

```bash
nx serve backend
```

**Terminal 2 (Frontend):**

```bash
nx serve frontend
```

---

## 🚀 First-Time Setup

If you are setting up the project for the very first time, please follow the step-by-step instructions in the [Setup Guide](SETUP.md).

---

## 🧪 Testing & Linting

```bash
nx test backend
nx test frontend

nx e2e frontend-e2e

nx lint backend
nx lint frontend
npx prettier --write .
```

---

## 📦 Deployment

- Builds output to `dist/apps/backend`.
- Deploy via Docker, PM2, or systemd behind a reverse proxy like Nginx or Caddy.

---

## 📚 Next Steps & Resources

- [Setup Guide](SETUP.md)
- [Common UX Elements Guide](docs/UX_COMMON.md)
- [Feature Components Catalog](docs/COMPONENTS.md)
- [Nx Docs](https://nx.dev)
- [tRPC](https://trpc.io)
- [Kysely](https://github.com/kysely-org/kysely)
- [Angular Standalone APIs](https://angular.dev/guide/standalone-components)
- [Fastify](https://www.fastify.io)

With this structure in mind, newcomers can navigate the repository, understand how front‑ and back‑end pieces interact, and identify the next areas to explore for deeper proficiency.
