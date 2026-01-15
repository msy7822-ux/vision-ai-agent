import warnings

# Suppress dataclasses_json warnings from getstream library
warnings.filterwarnings(
    "ignore",
    message=".*Missing.*value of non-optional type.*",
    category=RuntimeWarning,
    module="dataclasses_json"
)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import settings
from src.routers import coach_router

app = FastAPI(
    title=settings.app_name,
    version="0.0.1",
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """ヘルスチェックエンドポイント"""
    return {"status": "healthy", "app": settings.app_name}


@app.get("/")
async def root():
    """ルートエンドポイント"""
    return {"message": "Welcome to English Conversation Training API"}


# Include coach router
app.include_router(coach_router)
