"""
Swarnandrian Platform - Main FastAPI Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.db.mongodb import connect_db, close_db
from app.api.v1 import router as api_router
from app.core.websocket_manager import ws_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_db()
    print(f"✅ Connected to MongoDB: {settings.MONGODB_DB_NAME}")
    yield
    # Shutdown
    await close_db()
    print("🔴 MongoDB connection closed")


app = FastAPI(
    title="Swarnandrian Platform API",
    description="Enterprise Student Training & Evaluation Platform",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

# ─── CORS ────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ─────────────────────────────────────────────────────────────────
app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok", "platform": "Swarnandrian"}
