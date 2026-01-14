import time
from typing import Optional

import jwt
from getstream import Stream

from src.config import settings


class StreamClient:
    """GetStream クライアントラッパー"""

    def __init__(self):
        self.client = Stream(
            api_key=settings.stream_api_key,
            api_secret=settings.stream_api_secret,
        )

    def create_user_token(self, user_id: str, expiration_seconds: int = 3600) -> str:
        """ユーザー用のJWTトークンを生成"""
        now = int(time.time())
        payload = {
            "user_id": user_id,
            "iat": now,
            "exp": now + expiration_seconds,
        }
        token = jwt.encode(payload, settings.stream_api_secret, algorithm="HS256")
        return token

    async def create_call(self, call_id: str, call_type: str = "default") -> dict:
        """通話セッションを作成"""
        video_client = self.client.video
        call = video_client.call(call_type, call_id)

        # 通話を作成または取得
        response = call.get_or_create(
            data={"created_by_id": "system"}
        )

        return {
            "call_id": call_id,
            "call_type": call_type,
            "created": True,
        }

    def get_call_token(
        self, user_id: str, call_ids: Optional[list[str]] = None
    ) -> str:
        """通話参加用のトークンを生成"""
        return self.create_user_token(user_id)


# シングルトンインスタンス
stream_client = StreamClient()
