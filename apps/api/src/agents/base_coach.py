"""
Base Coach for English Conversation Training

Provides the foundation for different coaching modes.
Generates system prompts for Deepgram Voice Agent.
"""

import logging
from abc import ABC, abstractmethod
from typing import Literal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

Level = Literal["beginner", "intermediate", "advanced"]


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

    def get_greeting(self) -> str:
        """Return the initial greeting for the agent to speak first.

        Override this in subclasses for mode-specific greetings.
        """
        return "Hello! I'm your English conversation coach. Let's practice together!"
