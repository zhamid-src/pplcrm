# 🧱 PeopleCRM

**PeopleCRM** is a full-stack campaign CRM built with Nx, Angular, Fastify, and PostgreSQL. It includes user management, authentication, and session tracking, with a focus on performance and modularity.

---

## 🧰 Tech Stack

| Layer         | Stack / Tools                                                             |
| ------------- | ------------------------------------------------------------------------- |
| Frontend      | Angular 20, Tailwind CSS v4, DaisyUI v5, AG Grid (Community + Enterprise) |
| Backend       | Fastify 5, tRPC, Kysely ORM, PostgreSQL                                   |
| Auth          | JWT-based auth using `fast-jwt` with refresh tokens and sessions          |
| Styling       | Tailwind CSS, DaisyUI, SCSS                                               |
| Emails        | Nodemailer with SMTP for reset/verify flows                               |
| Build Tooling | Nx Monorepo, Esbuild, SWC                                                 |
| Testing       | Jest (unit), Playwright (e2e)                                             |

---

## General Structure

**Monorepo layout**  
The project uses an Nx workspace to host multiple applications and shared libraries:

- `apps/backend/` – Fastify-based API server using tRPC, with a modular architecture of controllers, repositories, migrations, and routers.
- `apps/frontend/` – Angular 20 SPA (standalone components & signals) styled with Tailwind CSS and DaisyUI.
- `common/` – Shared TypeScript/Zod definitions and Kysely database models used by both front‑ and back‑end.
- Root configs (`package.json`, `nx.json`, `tsconfig.base.json`) define dependencies, build targets, and TypeScript settings.

## Backend Highlights

- **Entry/Bootstrap**: `main.ts` boots a `FastifyServer` instance (`fastify.server.ts`) which registers REST routes and mounts the tRPC plugin.
- **Controllers & Repositories**:
  - `controllers/` (e.g. `auth.controller.ts`, `persons.controller.ts`) provide business logic.
  - `repositories/` (e.g. `base.repo.ts`) encapsulate CRUD operations with Kysely and implement a repository pattern.
- **Authentication**: JWT handling (access + refresh tokens) via `fast-jwt`, session tracking, and password hashing with `bcrypt`.
- **tRPC & REST**: API routes are exposed both as tRPC routers (`trpc-routers/`) and traditional REST routes (`rest-routes/`, `rest-schema/`).

## Frontend Highlights

- **Angular 20 Standalone**: Components defined without NgModules (`app.ts`, `app.routes.ts`), using signals and reactive forms (see `auth/signin-page.ts`).
- **Services**: `backend-svc/` hosts tRPC client setup, token storage, and search utilities.
- **Feature Components**: `components/` contains modules such as persons, households, tags, each with grids, detail pages, and services.
- **Layout & UX**: `layout/` (navbar, sidebar, theme service) and `uxcommon/` (alerts, icons) provide reusable UI pieces.

## Shared Library (`common/`)

- **Zod Schemas & Types**: `common.ts` defines validation schemas and utility types shared across the stack.
- **Database Models**: `kysely.models.ts` describes every table, enabling strong typing in repositories and controllers.

## Key Concepts & Orientation Tips

1. **Nx Workflows**: Use Nx commands (`nx serve backend`, `nx serve frontend`) to run or build specific apps. Examine `project.json` files within each app for target definitions.
2. **Repository Pattern**: To add a new table/feature, define a Kysely model, create a repository (`repositories/`), a controller, and expose it via tRPC/REST.
3. **Auth Flow**: Frontend `AuthService` & `TokenService` coordinate login, token storage, and session persistence; backend `AuthController` issues tokens and handles reset flows.
4. **tRPC Integration**: Client & server share types through the `common` library, enabling end‑to‑end type safety. Study `trpc-service.ts` (frontend) and `trpc.ts` (backend) for the handshake.

## Next Steps for Learning

- **Nx & Monorepos** – Read Nx docs to understand generators, caching, and workspace management.
- **tRPC & Kysely** – Dive into tRPC for type-safe RPC APIs and Kysely for expressive SQL in TypeScript.
- **Angular 20 & Signals** – Review Angular’s new standalone API and signal-based reactivity.
- **Authentication & Security** – Explore JWT best practices (`fast-jwt`), session handling, and password hashing with `bcrypt`.
- **Database Migrations** – Review `_migrations/` and `migrations.json`; learn how to generate and run migrations with Kysely.

With this structure in mind, newcomers can navigate the repository, understand how front‑ and back‑end pieces interact, and identify the next areas to explore for deeper proficiency.

---

## ⚙️ Setup Instructions

### 1. Prerequisites

Make sure you have:

- Node.js 18+
- Yarn or npm
- PostgreSQL (local or Docker)
- A working SMTP provider for email features

This will help you set up your environment if it's your first time:

## 🛠️ Local Setup Instructions (For First-Time Users)

Follow these steps if you're setting up your development environment from scratch on macOS:

---

### 🔧 Prerequisites (Quick Setup)

To install all required dependencies, initialize Nx, and set up PostgreSQL automatically, run the following script from your project root:

1. Make the script executable:
   chmod +x setup.sh

2. Run it:

./setup.sh

> ⚠️ This script is designed for macOS and assumes a local PostgreSQL setup. It will:
>
> - Install Homebrew (if missing)
> - Install Git, wget, nvm, Node.js, Angular CLI, Nx CLI
> - Install and start PostgreSQL
> - Create a Postgres role (`pplcrm`) and database (`pplcrm`)
> - Install npm dependencies

#### Hint regarding Postgresql

To start the server

```bash
brew services start postgresql
```

To stop the server later:

```bash
brew services stop postgresql
```

---

### 2. Clone and Install

```bash
git clone https://github.com/pplcrm-org/pplcrm.git
cd pplcrm
npm install
```

### 3. Environment Variables

Create a `.env` file in the root or inside `apps/backend/`:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/pplcrm
JWT_SECRET=your-super-secret
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=username@example.com
SMTP_PASS=password
```

## 🐘 PostgreSQL Setup

### Option A: Local PostgreSQL

1. Start PostgreSQL (e.g. via Homebrew or native installer)
2. Create the database:

```bash
psql -U postgres
CREATE DATABASE pplcrm;
3. Ensure .env contains the correct DATABASE_URL.
```

### Option B: Dockerized PostgreSQL

```bash
docker run --name pplcrm-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=pplcrm \
  -p 5432:5432 \
  -d postgres
```

## 🔧 Database Migrations

If you add Kysely or Drizzle-based migrations:

```bash
npm run db:migrate
```

## 🚀 Running the App

### Backend (Fastify)

```bash
nx serve backend
```

### Backend (Angular)

```bash
nx serve frontend
```

## 🧪 Testing

### Unit Tests (Jest)

```bash
nx test backend
nx test frontend
```

### End to end (playwright)

```bash
nx e2e frontend-e2e
```

## 🧹 Lint & Format

```bash
nx lint backend
nx lint frontend

npx prettier --write .
```

## 🌟 Features

- 🚀 Modern Angular UI with Tailwind + DaisyUI
- 🔒 Secure Auth (JWT, refresh tokens, hashed passwords)
- 📬 Email verification/reset via SMTP
- 🔄 AG Grid support for rich table views
- 🔌 Clean tRPC architecture for typed APIs
- 📦 Nx-powered monorepo for scale

## 📦 Useful Nx Commands

```bash
# Build all apps
nx build frontend
nx build backend

# Run affected tasks
nx affected:test
nx affected:lint
nx affected:build
```

## pplcrm Backend Architecture

The backend for `pplcrm` is a modular, type-safe system built using **Fastify**, **tRPC**, **Kysely**, and **PostgreSQL**. It is part of an **Nx monorepo**, and built with **esbuild** for performance.

---

### 📁 Directory Structure

- **apps/backend/**
  - **src/**
    - **app/**
      - **auth/** — JWT signing and validation logic
      - **controllers/** — tRPC route handlers
      - **repositories/** — Kysely-based data access layer
      - **services/** — Business logic like auth, email, sessions
      - **utils/** — Reusable helpers
    - **main.ts** — Fastify + tRPC initialization
  - **index.ts** — Entry point

---

### 🧱 Architectural Layers

#### 1. Controller Layer (tRPC)

- Located in `app/controllers/`
- Each controller corresponds to a database table (e.g. Tags, Users)
- Controllers inherit from a generic `BaseController`
- Handles business input validation and calls services or repositories

#### 2. Repository Layer (Kysely)

- Located in `app/repositories/`
- Each table has a corresponding repository (e.g. `TagsRepo`)
- Extends a generic `BaseRepository<T>` with CRUD operations
- All type-safe via `Models` interface from `kysely.models.ts`

#### 3. Service Layer

- Located in `app/services/`
- Encapsulates business logic (auth, profile merging, etc.)
- Services call one or more repositories
- Also responsible for sending emails or managing sessions

#### 4. Auth Layer

- Located in `app/auth/`
- Uses `fast-jwt` to sign/verify access and refresh tokens
- Used by the AuthService and also injected into tRPC context

---

### ⚙️ Tooling

| Tool          | Purpose                   |
| ------------- | ------------------------- |
| Fastify       | Web framework             |
| tRPC          | Type-safe backend router  |
| Kysely        | SQL builder (typed)       |
| PostgreSQL    | Relational database       |
| esbuild       | Fast bundler              |
| fast-jwt      | JWT library               |
| bcrypt        | Password hashing          |
| zod (planned) | Runtime schema validation |
| Nx            | Monorepo tooling          |

---

### 🔐 Authentication

- Passwords are hashed using `bcrypt`
- Tokens (access and refresh) are signed with `fast-jwt`
- Tokens can be stored in cookies or local storage
- On each request, tRPC context parses JWT and makes `userId` available

---

### ✅ Example Flow: Update a Row

1. Frontend calls `tags.update({ id, name })`
2. `TagsController.update()` is invoked
3. It calls `TagsRepo.update(id, payload)`
4. The row is updated using Kysely
5. Controller returns updated row or error

---

### 🧪 Testing & Dev

- Currently no testing framework set up (suggested: `vitest`)
- Local `.env` file holds credentials like DB connection and JWT secrets
- Strongly recommend using `zod` to validate config

---

### 🚀 Running Locally

pnpm install  
pnpm start backend

You can also run just the backend app directly from Nx using:

nx serve backend

---

### 📦 Deployment

- Built into `dist/apps/backend`
- Can be deployed via Docker, PM2, or systemd
- You can serve it behind a reverse proxy like Nginx or Caddy

## People CRM – Frontend

This is the frontend for **People CRM**, a modern Angular 20 application using standalone components and signals. It is structured to support scalability, maintainability, and modularity in a campaign-focused CRM tool.

---

### 🏗️ Architecture

#### Framework & Tools

- **Angular 20** (Standalone APIs, Signals, Zone-less mode)
- **Nx Monorepo** for project structure and tooling
- **Tailwind CSS** + **DaisyUI** for styling
- **AG Grid** for powerful table/data grid capabilities
- **tRPC** for type-safe API calls between frontend and backend
- **RxJS** (limited use in some services)

---

### 🧱 Directory Structure

apps/frontend/
├── src/
│ ├── app/
│ │ ├── auth/ # Authentication components
│ │ ├── components/ # Reusable UI components (tags, modals, etc.)
│ │ ├── data/ # Data stores and services
│ │ ├── layout/ # App layout, themes, navigation
│ │ ├── pages/ # Feature-specific pages
│ │ ├── uxcommon/ # Common UI elements (icons, alerts, etc.)
│ │ ├── app.config.ts # Angular application config
│ │ ├── app.routes.ts # Route configuration
│ │ ├── app.ts # Root component
│ │ └── main.ts # Bootstrap entry point
├── assets/ # Static assets
├── environments/ # Environment configs
└── index.html # Base HTML

---

### 🧩 Key Features

- **Zone-less Angular** using `provideZoneChangeDetection('noop')`
- **Tailwind + DaisyUI** for modern styling
- **Reusable `DataGrid`** component with undo/redo, delete, view, edit support
- **Signals + `effect()`** for reactive programming
- **Modular Feature Pages** per resource/entity (tags, users, etc.)

---

### 🔐 Backend Authentication

- Stored in local/session storage
- API token is managed via tRPC headers
- Auth logic is handled in `auth.service.ts` and `session.service.ts`

---

### 📦 API Integration

- Handled using `@trpc/client`
- Strongly typed backend calls
- Services in `data/` directory wrap API calls and share state via signals

---

### 📁 Notes

- AG Grid customization lives in `components/datagrid/`
- Alerts, modals, tags are in `uxcommon/`
- Shared logic is extracted to `abstract.service.ts`, `base-datagrid.ts`, etc.

---
