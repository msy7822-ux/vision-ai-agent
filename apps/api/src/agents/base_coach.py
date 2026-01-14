import logging
from abc import ABC, abstractmethod
from typing import Literal

from vision_agents.core import Agent, User
from vision_agents.plugins import gemini, getstream

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

Level = Literal["beginner", "intermediate", "advanced"]


class AudioOnlyRealtime(gemini.Realtime):
    """
    Audio-only Realtime LLM.

    Disables video track processing entirely to prevent WebSocket memory overflow.
    The Gemini Live API has a 1GB memory limit per connection, and continuous
    video frame transmission quickly exceeds this limit.

    By overriding watch_video_track() to do nothing, we prevent:
    - VideoForwarder creation
    - Frame PNG conversion
    - Video data transmission to Gemini API
    - Memory accumulation that causes connection closure
    """

    async def watch_video_track(self, track, shared_forwarder=None):
        """Disable video track monitoring - audio-only mode"""
        logger.info("Video track ignored - running in audio-only mode")
        return  # Do nothing


class BaseCoach(ABC):
    """English conversation coach base class"""

    def __init__(self, level: Level = "beginner"):
        self.level = level

    @abstractmethod
    def get_mode_instructions(self) -> str:
        """Return mode-specific instructions"""
        pass

    def get_level_instructions(self) -> str:
        """Return level-specific instructions"""
        if self.level == "beginner":
            return """
## Speaking Level: Beginner
- Speak SLOWLY and CLEARLY
- Use SIMPLE vocabulary (common words only)
- Short sentences (5-10 words max)
- Repeat key phrases when needed
- Give lots of encouragement
- If the learner makes mistakes, gently correct them
- Avoid idioms and complex grammar
"""
        elif self.level == "intermediate":
            return """
## Speaking Level: Intermediate
- Speak at a NATURAL pace
- Use varied vocabulary including some idioms
- Medium-length sentences
- Occasionally introduce new expressions
- Provide constructive feedback
- Challenge the learner appropriately
"""
        else:  # advanced
            return """
## Speaking Level: Advanced
- Speak at NATIVE speed
- Use complex vocabulary, idioms, and colloquialisms
- Natural sentence structures
- Use cultural references when appropriate
- Expect and encourage sophisticated responses
- Provide nuanced feedback on grammar and word choice
"""

    def get_base_instructions(self) -> str:
        """Return base instructions common to all coaches"""
        return """
# English Conversation Coach

You are an AI English conversation coach helping Japanese learners practice their English speaking skills.

## Core Principles
1. ALWAYS speak in English (unless correcting Japanese)
2. Be patient, encouraging, and supportive
3. Keep conversations natural and engaging
4. Provide feedback when appropriate
5. Adapt to the learner's responses

## Voice Style
- Speak clearly and naturally
- Use appropriate intonation
- Pause between sentences
- Be expressive but not over-the-top
"""

    def get_full_instructions(self) -> str:
        """Combine all instruction components"""
        return f"""
{self.get_base_instructions()}

{self.get_level_instructions()}

{self.get_mode_instructions()}
"""

    def create_agent(self) -> Agent:
        """Create the Vision Agent with full instructions"""
        agent = Agent(
            edge=getstream.Edge(),
            agent_user=User(name="English Coach", id="english-coach-agent"),
            instructions=self.get_full_instructions(),
            llm=AudioOnlyRealtime(),  # Audio-only mode to prevent WebSocket memory overflow
        )
        return agent
