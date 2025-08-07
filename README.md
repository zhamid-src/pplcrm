# 🧱 PeopleCRM

**PeopleCRM** is a full‑stack campaign CRM built with Nx, Angular, Fastify, and PostgreSQL. It supports user management, authentication, and session tracking while emphasizing performance and modularity.

---

## 🧰 Tech Stack

| Layer         | Tools                                                |
| ------------- | ---------------------------------------------------- |
| Frontend      | Angular 20, Tailwind CSS v4, DaisyUI v5, AG Grid     |
| Backend       | Fastify 5, tRPC, Kysely ORM, PostgreSQL              |
| Auth          | JWT via `fast-jwt`, refresh tokens, session tracking |
| Styling       | Tailwind CSS, DaisyUI, SCSS                          |
| Emails        | Nodemailer with SMTP                                 |
| Build Tooling | Nx Monorepo, Esbuild, SWC                            |
| Testing       | Jest (unit), Playwright (e2e)                        |

---

## 🗂️ Repository Structure

- `apps/backend/` – Fastify API server with controllers, repositories, migrations, and routers.
- `apps/frontend/` – Angular 20 SPA (standalone components & signals) styled with Tailwind CSS and DaisyUI.
- `common/` – Shared TypeScript/Zod definitions and Kysely database models.
- Root configs (`package.json`, `nx.json`, `tsconfig.base.json`) define dependencies, build targets, and TypeScript settings.

---

## 🔧 Backend Highlights

- `main.ts` boots a `FastifyServer` instance (`fastify.server.ts`) that registers REST routes and mounts tRPC.
- Controllers (`controllers/`) host business logic; repositories (`repositories/`) implement CRUD with Kysely.
- Authentication uses `fast-jwt` for access/refresh tokens, `bcrypt` for password hashing, and session tracking.
- API is exposed via both tRPC routers (`trpc-routers/`) and REST routes (`rest-routes/`, `rest-schema/`).

---

## 🎨 Frontend Highlights

- Standalone Angular 20 components (`app.ts`, `app.routes.ts`) using signals and reactive forms.
- `backend-svc/` provides tRPC client setup, token storage, and search utilities.
- Feature modules in `components/` (persons, households, tags, etc.) with grids, detail pages, and services.
- Reusable UI elements live in `layout/` and `uxcommon/` (navbar, sidebar, alerts, icons, etc.).

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Yarn or npm
- PostgreSQL (local or Docker)
- SMTP provider for email features

### Quick Setup (macOS)

```bash
chmod +x setup.sh
./setup.sh
```

> Installs dependencies, sets up PostgreSQL (`pplcrm` role and `pplcrm` database), and initializes Nx.

### Manual Setup

```bash
git clone https://github.com/pplcrm-org/pplcrm.git
cd pplcrm
npm install
```

### Environment Variables

Create a `.env` file in the project root or inside `apps/backend/`:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/pplcrm
JWT_SECRET=your-super-secret
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=username@example.com
SMTP_PASS=password
```

### PostgreSQL

**Local:**

```bash
psql -U postgres
CREATE DATABASE pplcrm;
```

**Docker:**

```bash
docker run --name pplcrm-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=pplcrm \
  -p 5432:5432 -d postgres
```

### Migrations

```bash
npm run db:migrate
```

---

## 🏃 Running the Apps

```bash
nx serve backend   # Fastify API
nx serve frontend  # Angular SPA
```

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

- [Nx Docs](https://nx.dev)
- [tRPC](https://trpc.io)
- [Kysely](https://github.com/kysely-org/kysely)
- [Angular Standalone APIs](https://angular.dev/guide/standalone-components)
- [Fastify](https://www.fastify.io)

With this structure in mind, newcomers can navigate the repository, understand how front‑ and back‑end pieces interact, and identify the next areas to explore for deeper proficiency.
