#!/bin/bash

set -e

REPO_URL="https://github.com/pplcrm-org/pplcrm.git"
PROJECT_DIR="pplcrm"

echo "📁 Cloning PeopleCRM repository..."
if [ -d "$PROJECT_DIR" ]; then
  echo "⚠️ Directory '$PROJECT_DIR' already exists. Skipping clone."
else
  git clone "$REPO_URL"
fi

cd "$PROJECT_DIR"

echo "🔧 Installing dependencies..."

# Install Homebrew if not installed
if ! command -v brew &> /dev/null; then
  echo "🍺 Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
  echo "✅ Homebrew already installed"
fi

# Install Git
if ! command -v git &> /dev/null; then
  echo "📦 Installing Git..."
  brew install git
else
  echo "✅ Git already installed"
fi

# Install wget
if ! command -v wget &> /dev/null; then
  echo "📦 Installing wget..."
  brew install wget
else
  echo "✅ wget already installed"
fi

# Install nvm
if [ ! -d "$HOME/.nvm" ]; then
  echo "📦 Installing nvm..."
  wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  source "$NVM_DIR/nvm.sh"
else
  echo "✅ nvm already installed"
  export NVM_DIR="$HOME/.nvm"
  source "$NVM_DIR/nvm.sh"
fi

# Install node
if ! command -v node &> /dev/null; then
  echo "📦 Installing latest Node.js..."
  nvm install node
else
  echo "✅ Node.js already installed"
fi

# Install Angular CLI
if ! command -v ng &> /dev/null; then
  echo "📦 Installing Angular CLI..."
  npm install -g @angular/cli
else
  echo "✅ Angular CLI already installed"
fi

# Install Nx CLI
if ! command -v nx &> /dev/null; then
  echo "📦 Installing Nx CLI..."
  npm install -g nx
else
  echo "✅ Nx CLI already installed"
fi

# Initialize Nx if needed
if [ ! -f "nx.json" ]; then
  echo "🛠️ Initializing Nx..."
  npx nx init
fi

# Install PostgreSQL
if ! command -v psql &> /dev/null; then
  echo "📦 Installing PostgreSQL..."
  brew install postgresql
fi

echo "▶️ Starting PostgreSQL..."
brew services start postgresql

# Wait briefly in case Postgres isn't ready
sleep 3

echo "🔐 Creating database and provisioning least-privilege roles..."
# Create the database (owned by the local superuser for now), then run the S-2
# role-split provisioning: it creates pplcrm_owner / pplcrm_app, transfers the
# database + public-schema ownership to pplcrm_owner, and locks down public.
# The app then migrates as pplcrm_owner and serves as pplcrm_app — see
# apps/backend/scripts/setup-db-roles.sql and .claude/skills/pplcrm-migrations.
psql postgres <<'EOF'
SELECT 'CREATE DATABASE pplcrm' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'pplcrm')\gexec
EOF

# Dev passwords are ignored under local `trust` auth but keep them in sync with
# .env.development so the same file works if you switch to password auth.
psql -d pplcrm -v ON_ERROR_STOP=1 \
  -v owner_pw='dev_owner_pw' \
  -v app_pw='dev_app_pw' \
  -v current_owner="$(whoami)" \
  -f apps/backend/scripts/setup-db-roles.sql

echo "✅ Database created and roles provisioned (pplcrm_owner / pplcrm_app)"

# Provision the dedicated, disposable test database (pplcrm_test) used by the
# backend Vitest suite, so specs never touch the dev DB. Schema is built by the
# Vitest globalSetup on first run; this just creates the DB + grants.
echo "🧪 Provisioning the test database (pplcrm_test)..."
apps/backend/scripts/setup-test-db.sh
echo "✅ Test database provisioned (pplcrm_test) — set DB_NAME=pplcrm_test in .env.test"

# Install project dependencies
if [ -f "package.json" ]; then
  echo "📦 Installing npm dependencies..."
  npm install
else
  echo "⚠️ No package.json found in current directory. Please check that the repo cloned correctly."
  exit 1
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "👉 To get started:"
echo "cd pplcrm"
echo "nx serve backend"
echo "nx serve frontend"
