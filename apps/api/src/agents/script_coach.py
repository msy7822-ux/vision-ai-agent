"""
Script Coach for English Conversation Training

Guides users through predefined conversation scripts.
The AI plays the partner role while the user practices their lines.
"""

import json
import logging
from pathlib import Path
from typing import Optional

from .base_coach import BaseCoach, Level
from ..models.script import Script, ScriptInfo

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SCRIPTS_DIR = Path(__file__).parent.parent / "data" / "scripts"


class ScriptCoach(BaseCoach):
    """Coach for script-based conversation practice"""

    def __init__(self, level: Level = "beginner", script_id: Optional[str] = None):
        super().__init__(level)
        self.script_id = script_id
        self.script: Optional[Script] = None
        if script_id:
            self.script = self.load_script(script_id)

    @staticmethod
    def list_scripts() -> list[ScriptInfo]:
        """List all available scripts"""
        scripts = []
        for script_file in SCRIPTS_DIR.glob("*.json"):
            try:
                with open(script_file, encoding="utf-8") as f:
                    data = json.load(f)
                    scripts.append(ScriptInfo(
                        id=data["id"],
                        title=data["title"],
                        title_ja=data["title_ja"],
                        description=data["description"],
                        difficulty=data["difficulty"],
                        category=data["category"],
                        estimated_minutes=data["estimated_minutes"],
                        line_count=len(data["lines"])
                    ))
            except (json.JSONDecodeError, KeyError) as e:
                logger.warning(f"Failed to load script {script_file}: {e}")
        return sorted(scripts, key=lambda s: (s.category, s.difficulty, s.title))

    @staticmethod
    def load_script(script_id: str) -> Optional[Script]:
        """Load a specific script by ID"""
        script_file = SCRIPTS_DIR / f"{script_id}.json"
        if not script_file.exists():
            logger.warning(f"Script not found: {script_id}")
            return None
        try:
            with open(script_file, encoding="utf-8") as f:
                data = json.load(f)
                return Script(**data)
        except (json.JSONDecodeError, KeyError) as e:
            logger.error(f"Failed to load script {script_id}: {e}")
            return None

    def get_script_content_for_prompt(self) -> str:
        """Format script content for the AI prompt"""
        if not self.script:
            return ""

        lines = []
        for line in self.script.lines:
            role = "PARTNER (you)" if line.speaker == "partner" else "USER (learner)"
            lines.append(f"Line {line.id} - {role}: \"{line.text}\"")

        return "\n".join(lines)

    def get_mode_instructions(self) -> str:
        """Return script mode specific instructions"""
        if not self.script:
            return "Error: No script loaded."

        script_content = self.get_script_content_for_prompt()

        return f"""
## Mode: Script Practice

You are helping the user practice a specific conversation script.
You play the "partner" role, and the user practices the "user" lines.

### Script Information
- **Title**: {self.script.title}
- **Description**: {self.script.description}
- **Difficulty**: {self.script.difficulty}

### The Script
{script_content}

### Important Rules
1. **Follow the script in order** - Say your lines (PARTNER) when it's your turn
2. **Wait for the user** - After you speak, wait for the user to say their line
3. **Stay in character** - You are the conversation partner, not a teacher
4. **Be flexible** - If the user says something close enough to the script, accept it and continue
5. **Handle mistakes gracefully**:
   - If the user struggles, give a subtle hint
   - If they deviate from the script, gently guide them back
   - Never break character to correct them mid-conversation
6. **Provide feedback at the end** - After completing the script, you can offer brief feedback on pronunciation or phrasing

### Difficulty Adjustments ({self.level})
- **Beginner**: Accept approximate responses, speak slowly, be extra patient
- **Intermediate**: Expect closer matches to the script, normal speaking pace
- **Advanced**: Expect precise pronunciation and natural delivery

### Starting the Conversation
Begin by saying Line 1 (your first partner line). The conversation has started!
"""

    def get_greeting(self) -> str:
        """Return the first partner line as the greeting"""
        if not self.script or not self.script.lines:
            return "Hello! Let's practice a conversation together."

        # Find the first partner line
        for line in self.script.lines:
            if line.speaker == "partner":
                return line.text

        return "Hello! Let's practice a conversation together."
