import asyncio
import uuid

from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.config import settings
from src.stream_client import stream_client
from src.agent import create_agent

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


# === Request/Response Models ===


class CreateCallRequest(BaseModel):
    call_type: str = "default"


class CreateCallResponse(BaseModel):
    call_id: str
    call_type: str
    created: bool


class JoinCallRequest(BaseModel):
    call_id: str


class JoinCallResponse(BaseModel):
    status: str
    call_id: str
    message: str


class TokenResponse(BaseModel):
    token: str
    user_id: str
    api_key: str


# === API Endpoints ===


@app.post("/api/call/create", response_model=CreateCallResponse)
async def create_call(request: CreateCallRequest):
    """通話セッションを作成"""
    call_id = str(uuid.uuid4())
    result = await stream_client.create_call(call_id=call_id, call_type=request.call_type)
    return CreateCallResponse(**result)


async def run_agent_in_call(call_id: str):
    """バックグラウンドでエージェントを通話に参加させる"""
    agent = create_agent()
    call = await agent.create_call(call_type="default", call_id=call_id)
    async with agent.join(call):
        # 最初のプロンプトを送信
        await agent.simple_response(
            "Look at the video and tell me what objects you see. Speak naturally in English."
        )

        # 定期的にプロンプトを送信して継続的に物体検出を行う
        for _ in range(60):  # 約5分間（5秒 x 60回）
            await asyncio.sleep(5)
            await agent.simple_response(
                "What objects do you see now? Tell me if anything has changed."
            )

        await agent.finish()


@app.post("/api/call/join", response_model=JoinCallResponse)
async def join_call(request: JoinCallRequest, background_tasks: BackgroundTasks):
    """エージェントを通話に参加させる"""
    background_tasks.add_task(run_agent_in_call, request.call_id)
    return JoinCallResponse(
        status="joining",
        call_id=request.call_id,
        message="Agent is joining the call",
    )


@app.get("/api/call/token", response_model=TokenResponse)
async def get_call_token(user_id: str | None = None):
    """フロントエンド用のトークンを発行"""
    if not user_id:
        user_id = f"user-{uuid.uuid4().hex[:8]}"

    token = stream_client.get_call_token(user_id=user_id)
    return TokenResponse(
        token=token,
        user_id=user_id,
        api_key=settings.stream_api_key,
    )
