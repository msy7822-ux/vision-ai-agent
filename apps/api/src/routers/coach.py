import logging

from fastapi import APIRouter, HTTPException

from src.agents import SituationCoach
from src.agents.script_coach import ScriptCoach
from src.config import settings
from src.models.coach import (
    ScenarioInfo,
    ScenariosResponse,
    VoiceAgentConfigRequest,
    VoiceAgentConfigResponse,
)
from src.models.script import ScriptsResponse, ScriptResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/coach", tags=["coach"])

SCENARIOS = [
    ScenarioInfo(
        id="restaurant",
        title="Restaurant",
        title_ja="レストラン注文",
        description="Order food, ask about menu items, and request the check",
        difficulty="Easy",
    ),
    ScenarioInfo(
        id="directions",
        title="Asking Directions",
        title_ja="道案内",
        description="Ask for and give directions to places around town",
        difficulty="Medium",
    ),
    ScenarioInfo(
        id="hotel",
        title="Hotel Check-in",
        title_ja="ホテルチェックイン",
        description="Check in, ask about amenities, and handle requests",
        difficulty="Easy",
    ),
    ScenarioInfo(
        id="shopping",
        title="Shopping",
        title_ja="ショッピング",
        description="Find items, ask about sizes/prices, and make purchases",
        difficulty="Medium",
    ),
]


@router.post("/voice-agent/config", response_model=VoiceAgentConfigResponse)
async def get_voice_agent_config(request: VoiceAgentConfigRequest):
    """
    Get Voice Agent configuration for frontend direct connection.

    Returns the system prompt and greeting based on mode, level, and scenario.
    Frontend will use this to configure the Deepgram WebSocket connection.
    """
    logger.info(
        f"Voice Agent config requested: mode={request.mode}, "
        f"level={request.level}, scenario={request.scenario}, script_id={request.script_id}"
    )

    if request.mode == "script":
        if not request.script_id:
            raise HTTPException(status_code=400, detail="script_id is required for script mode")
        coach = ScriptCoach(level=request.level, script_id=request.script_id)
        if not coach.script:
            raise HTTPException(status_code=404, detail=f"Script not found: {request.script_id}")
    elif request.mode == "situation":
        coach = SituationCoach(level=request.level, scenario=request.scenario)
    else:
        coach = SituationCoach(level=request.level, scenario="restaurant")

    return VoiceAgentConfigResponse(
        api_key=settings.deepgram_api_key,
        prompt=coach.get_full_instructions(),
        greeting=coach.get_greeting(),
        voice="aura-2-odysseus-en",
        listen_model="nova-3",
        think_provider="open_ai",
        think_model="gpt-4o-mini",
    )


@router.get("/scenarios", response_model=ScenariosResponse)
async def get_scenarios():
    """Get list of available scenarios"""
    return ScenariosResponse(scenarios=SCENARIOS)


@router.get("/scripts", response_model=ScriptsResponse)
async def get_scripts():
    """Get list of available practice scripts"""
    scripts = ScriptCoach.list_scripts()
    return ScriptsResponse(scripts=scripts)


@router.get("/scripts/{script_id}", response_model=ScriptResponse)
async def get_script(script_id: str):
    """Get a specific practice script by ID"""
    script = ScriptCoach.load_script(script_id)
    if not script:
        raise HTTPException(status_code=404, detail=f"Script not found: {script_id}")
    return ScriptResponse(script=script)
