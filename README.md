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
- API is exposed via both tRPC routers and REST routes, organized by domain under `apps/backend/src/app/modules`.

---

## 🎨 Frontend Highlights

- Standalone Angular 20 components (`app.ts`, `app.routes.ts`) using signals and reactive forms.
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

If you are setting up the project for the very first time on a new machine, follow these steps.

### 1. Prerequisites

Ensure you have the following installed:
- Node.js 18+
- Yarn or npm
- Docker Desktop (recommended for database and storage emulation)

*(Note: macOS users can alternately run `./setup.sh` for an automated native setup instead of using Docker).*

### 2. Clone and Install Dependencies

```bash
git clone https://github.com/zhamid-src/pplcrm.git
cd pplcrm
npm install
```

### 3. Environment Variables

Create an environment file named `.env.development` in the root of the project:

```env
DB_USER=postgres
DB_NAME=pplcrm
DB_PASSWORD=postgres
DB_PORT=5432
DB_HOST=localhost
DB_SSL=false
SHARED_SECRET=your-super-secret
```

### 4. Create Background Services (Docker)

Make sure Docker Desktop is open and running.

**Database (PostgreSQL):**
```bash
docker run --name pplcrm-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=pplcrm \
  -p 5432:5432 -d postgres
```

**Blob Storage (Azurite):**
```bash
docker run --name pplcrm-azurite -p 10000:10000 -p 10001:10001 -p 10002:10002 -d mcr.microsoft.com/azure-storage/azurite
npm run azurite:init
```
*(The init script creates an `uploads` container, applies CORS, and outputs a SAS URL valid for one hour).*

### 5. Run Database Migrations

With the database running, build your tables:

```bash
npm run db:migrate
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
