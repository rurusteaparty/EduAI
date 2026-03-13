#!/usr/bin/env bash
set -e

echo "========================================"
echo "  EduAI Platform — Setup Script"
echo "========================================"

# ── 1. Check dependencies ──────────────────
command -v docker >/dev/null 2>&1 || { echo "ERROR: Docker not found. Install from https://docker.com"; exit 1; }
command -v docker-compose >/dev/null 2>&1 || command -v docker >/dev/null 2>&1 || { echo "ERROR: docker compose not found"; exit 1; }

# ── 2. Create .env if missing ──────────────
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  # Generate a random SECRET_KEY
  SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || openssl rand -hex 32)
  sed -i "s/SECRET_KEY=.*/SECRET_KEY=${SECRET}/" backend/.env
  echo ""
  echo "⚠️  backend/.env created from example."
  echo "   Open backend/.env and set your GROQ_API_KEY"
  echo "   Get a free key at: https://console.groq.com/keys"
  echo ""
fi

if [ ! -f frontend/.env.local ]; then
  cp frontend/.env.local.example frontend/.env.local 2>/dev/null || echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > frontend/.env.local
fi

# ── 3. Create data directories ────────────
mkdir -p data/uploads data/faiss_index

# ── 4. Build & start ─────────────────────
echo "Building and starting containers..."
docker compose up --build -d

echo ""
echo "✅ EduAI Platform is starting up!"
echo ""
echo "  Frontend  →  http://localhost:3000"
echo "  API Docs  →  http://localhost:8000/docs"
echo "  Backend   →  http://localhost:8000"
echo ""
echo "To view logs:   docker compose logs -f"
echo "To stop:        docker compose down"
