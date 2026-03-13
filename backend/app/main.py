from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.db.session import create_tables
from app.api.routes import auth, chat, documents, flashcards, quiz, analytics, users

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("🚀 Starting EduAI Platform...")
    await create_tables()
    
    # Initialize FAISS index
    from app.services.rag.vector_store import faiss_store
    await faiss_store.initialize()
    
    logger.info("✅ EduAI Platform ready!")
    yield
    
    logger.info("🛑 Shutting down EduAI Platform...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered Educational Assistant with RAG, adaptive learning, and analytics",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── Middleware ──────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# ─── Routes ──────────────────────────────────────────────────────────────────────

PREFIX = settings.API_V1_PREFIX

app.include_router(auth.router, prefix=PREFIX, tags=["Authentication"])
app.include_router(users.router, prefix=PREFIX, tags=["Users"])
app.include_router(chat.router, prefix=PREFIX, tags=["Chat"])
app.include_router(documents.router, prefix=PREFIX, tags=["Documents"])
app.include_router(flashcards.router, prefix=PREFIX, tags=["Flashcards"])
app.include_router(quiz.router, prefix=PREFIX, tags=["Quiz"])
app.include_router(analytics.router, prefix=PREFIX, tags=["Analytics"])


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "app": settings.APP_NAME,
    }


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Welcome to EduAI Platform API",
        "docs": "/docs",
        "version": settings.APP_VERSION,
    }
