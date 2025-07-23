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

echo "🔐 Setting up PostgreSQL user and database..."
psql postgres <<EOF
DO \$\$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles WHERE rolname = 'pplcrm'
   ) THEN
      CREATE ROLE pplcrm WITH LOGIN PASSWORD '[REDACTED]';
   END IF;
END
\$\$;

CREATE DATABASE pplcrm OWNER pplcrm;
EOF

echo "✅ PostgreSQL user and database created (if not already)"

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
