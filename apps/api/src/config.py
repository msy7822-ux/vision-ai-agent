from pydantic_settings import BaseSettings


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
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
