from typing import Literal, Optional

from pydantic import BaseModel

Level = Literal["beginner", "intermediate", "advanced"]
Mode = Literal["freetalk", "pronunciation", "situation", "script"]
Scenario = Literal["restaurant", "directions", "hotel", "shopping"]


class StartSessionRequest(BaseModel):
    mode: Mode
    level: Level = "beginner"
    scenario: Optional[Scenario] = None


class StartSessionResponse(BaseModel):
    call_id: str
    mode: Mode
    level: Level
    scenario: Optional[Scenario] = None


class JoinSessionResponse(BaseModel):
    status: str
    call_id: str
    message: str


class EndSessionRequest(BaseModel):
    duration: int
    messages_exchanged: int


class EndSessionResponse(BaseModel):
    status: str
    message: str


class ScenarioInfo(BaseModel):
    id: str
    title: str
    title_ja: str
    description: str
    difficulty: str


class ScenariosResponse(BaseModel):
    scenarios: list[ScenarioInfo]


class VoiceAgentConfigRequest(BaseModel):
    """Request for Voice Agent configuration"""
    mode: Mode
    level: Level = "beginner"
    scenario: Optional[Scenario] = None
    script_id: Optional[str] = None


class VoiceAgentConfigResponse(BaseModel):
    """Voice Agent configuration for frontend direct connection"""
    api_key: str
    prompt: str
    greeting: str
    voice: str = "aura-2-odysseus-en"
    listen_model: str = "nova-3"
    think_provider: str = "open_ai"
    think_model: str = "gpt-4o-mini"
