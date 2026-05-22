# 🚀 PeopleCRM Setup Guide

This guide covers setting up your local development environment for **PeopleCRM** from scratch. 

If you are a macOS user, you can alternately run the automated setup script:
```bash
./setup.sh
```

Otherwise, follow the step-by-step instructions below.

---

## 📋 Prerequisites

Ensure you have the following installed on your machine:
* **Node.js**: Version 18 or higher (LTS recommended)
* **npm** or **Yarn**
* **Docker Desktop**: Recommended for Postgres database and Azurite blob storage emulation.

---

## 🛠️ Step-by-Step Setup

### 1. Clone & Install Dependencies

Clone the repository and install the npm dependencies:

```bash
git clone https://github.com/zhamid-src/pplcrm.git
cd pplcrm
npm install
```

### 2. Environment Variables

Create an environment file named `.env.development` in the root of the project. This configures the backend connection to your local database and shared auth secrets.

```env
DB_USER=postgres
DB_NAME=pplcrm
DB_PASSWORD=postgres
DB_PORT=5432
DB_HOST=localhost
DB_SSL=false
SHARED_SECRET=your-super-secret
```

### 3. Create Background Services (Docker)

Make sure Docker Desktop is open and running, then spin up the database and storage services:

#### Database (PostgreSQL)
```bash
docker run --name pplcrm-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=pplcrm \
  -p 5432:5432 -d postgres
```

#### Blob Storage Emulation (Azurite)
```bash
docker run --name pplcrm-azurite \
  -p 10000:10000 -p 10001:10001 -p 10002:10002 \
  -d mcr.microsoft.com/azure-storage/azurite

# Initialize the storage container structure
npm run azurite:init
```
*(The init script creates the required `uploads` container, configures CORS, and outputs a local SAS URL valid for one hour).*

### 4. Run Database Migrations

Apply the database schema and migrate your local database to the latest state:

```bash
npm run db:migrate
```

---

## 🎉 Next Steps

Now that your first-time setup is complete, you can start developing daily! 
Refer back to the main [README.md](README.md) for details on daily command usage, starting/stopping services, and running tests.
