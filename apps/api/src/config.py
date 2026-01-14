from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# プロジェクトルートの.envを参照し、環境変数として読み込む
# これにより、getstream等のサードパーティライブラリも環境変数を参照できる
ENV_FILE = Path(__file__).parent.parent.parent.parent / ".env"
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

    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]

    class Config:
        env_file = ENV_FILE
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
