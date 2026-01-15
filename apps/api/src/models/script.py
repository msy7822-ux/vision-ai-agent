from typing import Literal, Optional

from pydantic import BaseModel

Difficulty = Literal["beginner", "intermediate", "advanced"]
Category = Literal["daily", "travel", "business"]
Speaker = Literal["user", "partner"]


class ScriptLine(BaseModel):
    """A single line in the conversation script"""
    id: int
    speaker: Speaker
    text: str
    notes: Optional[str] = None


class Script(BaseModel):
    """Full script with all conversation lines"""
    id: str
    title: str
    title_ja: str
    description: str
    difficulty: Difficulty
    category: Category
    estimated_minutes: int
    lines: list[ScriptLine]


class ScriptInfo(BaseModel):
    """Script summary for listing"""
    id: str
    title: str
    title_ja: str
    description: str
    difficulty: Difficulty
    category: Category
    estimated_minutes: int
    line_count: int


class ScriptsResponse(BaseModel):
    """Response for script listing endpoint"""
    scripts: list[ScriptInfo]


class ScriptResponse(BaseModel):
    """Response for single script endpoint"""
    script: Script


class ScriptVoiceAgentConfigRequest(BaseModel):
    """Request for Script Voice Agent configuration"""
    script_id: str
    level: Difficulty = "beginner"
