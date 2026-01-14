import asyncio
import logging
import uuid

from fastapi import APIRouter, BackgroundTasks

from src.agents import SituationCoach
from src.models.coach import (
    EndSessionRequest,
    EndSessionResponse,
    JoinSessionResponse,
    ScenarioInfo,
    ScenariosResponse,
    StartSessionRequest,
    StartSessionResponse,
)
from src.stream_client import stream_client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/coach", tags=["coach"])

# In-memory session storage (for production, use Redis or a database)
active_sessions: dict[str, dict] = {}

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


async def run_coach_in_call(
    call_id: str,
    mode: str,
    level: str,
    scenario: str | None = None,
    max_retries: int = 3,
):
    """Run the coach agent in a call with retry logic"""
    logger.info(f"Starting coach for call {call_id}: mode={mode}, level={level}, scenario={scenario}")

    if mode == "situation":
        coach = SituationCoach(level=level, scenario=scenario)
    else:
        coach = SituationCoach(level=level, scenario="restaurant")

    for attempt in range(max_retries):
        try:
            agent = coach.create_agent()
            call = await agent.create_call(call_type="default", call_id=call_id)

            async with agent.join(call):
                await agent.simple_response(
                    "Start the conversation naturally based on your role in the scenario."
                )

                for _ in range(120):
                    await asyncio.sleep(5)
                    # Keep the agent alive and responsive
                    pass

                await agent.finish()
            # Success - exit retry loop
            return

        except TimeoutError as e:
            logger.warning(f"Attempt {attempt + 1}/{max_retries} failed with timeout: {e}")
            if attempt < max_retries - 1:
                await asyncio.sleep(2)  # Wait before retry
            else:
                logger.error(f"All {max_retries} attempts failed for call {call_id}")

        except Exception as e:
            logger.error(f"Attempt {attempt + 1}/{max_retries} failed with error: {e}")
            if attempt < max_retries - 1:
                await asyncio.sleep(2)  # Wait before retry
            else:
                logger.error(f"All {max_retries} attempts failed for call {call_id}")


@router.post("/session/start", response_model=StartSessionResponse)
async def start_session(request: StartSessionRequest):
    """Start a new coaching session"""
    call_id = str(uuid.uuid4())

    await stream_client.create_call(call_id=call_id, call_type="default")

    # Store session info for later use when coach joins
    active_sessions[call_id] = {
        "mode": request.mode,
        "level": request.level,
        "scenario": request.scenario,
    }
    logger.info(f"Session created: {call_id} with config: {active_sessions[call_id]}")

    return StartSessionResponse(
        call_id=call_id,
        mode=request.mode,
        level=request.level,
        scenario=request.scenario,
    )


@router.post("/session/{call_id}/join", response_model=JoinSessionResponse)
async def join_session(call_id: str, background_tasks: BackgroundTasks):
    """Have the coach join an existing session"""
    # Get session config from storage
    session_config = active_sessions.get(call_id, {})
    mode = session_config.get("mode", "situation")
    level = session_config.get("level", "beginner")
    scenario = session_config.get("scenario", "restaurant")

    logger.info(f"Coach joining session {call_id}: mode={mode}, level={level}, scenario={scenario}")

    background_tasks.add_task(
        run_coach_in_call,
        call_id=call_id,
        mode=mode,
        level=level,
        scenario=scenario,
    )

    return JoinSessionResponse(
        status="joining",
        call_id=call_id,
        message="Coach is joining the session",
    )


@router.post("/session/{call_id}/end", response_model=EndSessionResponse)
async def end_session(call_id: str, request: EndSessionRequest):
    """End a coaching session and save progress"""
    logger.info(
        f"Session {call_id} ended: duration={request.duration}s, "
        f"messages={request.messages_exchanged}"
    )

    return EndSessionResponse(
        status="completed",
        message="Session ended successfully",
    )


@router.get("/scenarios", response_model=ScenariosResponse)
async def get_scenarios():
    """Get list of available scenarios"""
    return ScenariosResponse(scenarios=SCENARIOS)
