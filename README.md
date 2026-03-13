# EduAI Platform

AI-powered educational assistant with RAG, adaptive tutoring, flashcards, quizzes, and analytics.

## Quick Start (Docker — recommended)

```bash
# 1. Set your Groq API key (free at https://console.groq.com/keys)
#    Open backend/.env and set GROQ_API_KEY=gsk_...

# 2. Run setup (creates .env, builds containers, starts everything)
bash setup.sh

# App is live:
#   Frontend  →  http://localhost:3000
#   API Docs  →  http://localhost:8000/docs
```

## Manual Install (no Docker)

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env: set GROQ_API_KEY and SECRET_KEY and DATABASE_URL
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
```

## Run Tests
```bash
cd backend
pip install -r requirements.txt
pytest ../tests/ -v
```

## Bug Fixes Applied

| # | File | Bug | Fix |
|---|------|-----|-----|
| 1 | `api/routes/auth.py` | `get_me` used broken `__import__` hack | Replaced with `Depends(get_current_user)` |
| 2 | `api/routes/chat.py` | Background task used closed request DB session | Task now opens its own `AsyncSessionLocal` |
| 3 | `api/routes/documents.py` | `process_document` referenced but never defined | Function added — was causing `NameError` |
| 4 | `services/quiz/generator.py` | `glob("user_*_doc_N")` leaked other users' data | Uses exact user-scoped path |
| 5 | `services/flashcard/generator.py` | Same cross-user data leak | Same fix |
| 6 | `api/routes/flashcards.py` | `user_id` not passed to generator | Passed through from route |
| 7 | `api/routes/quiz.py` | `/attempts/history` shadowed by `/{quiz_id}` | Moved above the path param route |
| 8 | `schemas/schemas.py` | Pydantic v1 `validator` import, v1-style `Config` | Removed; uses `model_config` dict |
| 9 | `db/session.py` | Models not imported before `create_all` | Added `import app.models.models` |
| 10 | `requirements.txt` | `aioredis==2.0.1` conflicts with `redis==5.0.4` | Removed `aioredis`; `redis[hiredis]` has async |
| 11 | Repo root | `{backend` and `{app` brace-expansion artifact dirs | Removed |
