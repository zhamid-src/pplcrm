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

## 📁 Project Structure

<pre>

pplcrm/
├── apps/
│   ├── frontend/          # Angular app (uses Tailwind + DaisyUI)
│   ├── backend/           # Fastify + tRPC server (ESM)
│   ├── frontend-e2e/      # Playwright-based E2E tests
│   └── backend-e2e/       # Placeholder for backend tests
├── common/                # Shared types/models/interfaces
├── .nx/                   # Nx cache
├── .github/               # GitHub Actions (optional)
├── .vscode/               # Editor config

</pre>

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
