import os
from pathlib import Path
from typing import Union

from dotenv import load_dotenv
from pydantic import field_validator
from pydantic_settings import BaseSettings

# ローカル開発時はプロジェクトルートの.envを参照
# Cloud Run等の本番環境では環境変数が直接設定される
ENV_FILE = Path(__file__).parent.parent.parent.parent / ".env"
if ENV_FILE.exists():
    load_dotenv(ENV_FILE)


class Settings(BaseSettings):
    # App
    app_name: str = "English Conversation Training API"
    debug: bool = False

    # GetStream
    stream_api_key: str = ""
    stream_api_secret: str = ""

    # Gemini
    google_api_key: str = ""

    # CORS - 環境変数 CORS_ORIGINS をカンマ区切りで指定可能
    # 例: CORS_ORIGINS=https://app.vercel.app,http://localhost:3000
    cors_origins: Union[str, list[str]] = "http://localhost:3000"

    class Config:
        env_file = ENV_FILE if ENV_FILE.exists() else None
        env_file_encoding = "utf-8"
        extra = "ignore"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        """環境変数からカンマ区切りでCORSオリジンをパース"""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v


settings = Settings()
