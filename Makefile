.PHONY: setup dev backend frontend db stop clean logs

# ── Setup ──────────────────────────────────────────────────────────────────────
setup:
	bash setup.sh

# ── Development ────────────────────────────────────────────────────────────────
backend:
	cd backend && source venv/bin/activate && \
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

frontend:
	cd frontend && npm run dev

# ── Database ───────────────────────────────────────────────────────────────────
db:
	docker-compose up -d postgres redis
	@echo "PostgreSQL: localhost:5432 | Redis: localhost:6379"

migrate:
	cd backend && source venv/bin/activate && alembic upgrade head

migrate-new:
	cd backend && source venv/bin/activate && \
	alembic revision --autogenerate -m "$(MSG)"

# ── Docker full stack ──────────────────────────────────────────────────────────
up:
	docker-compose up --build

down:
	docker-compose down

stop:
	docker-compose stop

logs:
	docker-compose logs -f

# ── Cleanup ────────────────────────────────────────────────────────────────────
clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete 2>/dev/null || true
	find . -name ".DS_Store" -delete 2>/dev/null || true
	cd frontend && rm -rf .next node_modules/.cache

clean-data:
	rm -rf backend/data/faiss_index/* backend/data/uploads/*
	@echo "FAISS index and uploads cleared"

# ── Testing ────────────────────────────────────────────────────────────────────
test:
	cd backend && source venv/bin/activate && pytest tests/ -v

# ── Production ─────────────────────────────────────────────────────────────────
build-frontend:
	cd frontend && npm run build

help:
	@echo ""
	@echo "EduAI Platform — Available Commands:"
	@echo "  make setup          — First-time setup"
	@echo "  make db             — Start Postgres + Redis"
	@echo "  make backend        — Run FastAPI server"
	@echo "  make frontend       — Run Next.js dev server"
	@echo "  make migrate        — Apply DB migrations"
	@echo "  make up             — Full Docker stack"
	@echo "  make logs           — Docker logs"
	@echo "  make clean          — Remove caches"
	@echo ""
