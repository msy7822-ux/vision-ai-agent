import logging
from pathlib import Path
from typing import Literal, Optional

from .base_coach import BaseCoach, Level

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

Scenario = Literal["restaurant", "directions", "hotel", "shopping"]

PROMPTS_DIR = Path(__file__).parent.parent / "prompts" / "situations"


class SituationCoach(BaseCoach):
    """Coach for situation-based role-play practice"""

    def __init__(self, level: Level = "beginner", scenario: Optional[Scenario] = None):
        super().__init__(level)
        self.scenario = scenario or "restaurant"

    def get_scenario_prompt(self) -> str:
        """Load scenario-specific prompt from file"""
        prompt_file = PROMPTS_DIR / f"{self.scenario}.md"
        if prompt_file.exists():
            return prompt_file.read_text()
        return self._get_default_scenario_prompt()

    def _get_default_scenario_prompt(self) -> str:
        """Fallback prompts if file not found"""
        defaults = {
            "restaurant": """
## Scenario: Restaurant
You are a friendly waiter/waitress at a casual American restaurant.

### Your Role
- Greet customers warmly
- Explain menu items when asked
- Take orders politely
- Handle special requests (allergies, preferences)
- Offer recommendations
- Process payment at the end

### Conversation Flow
1. Greeting and seating
2. Offer drinks/appetizers
3. Explain specials
4. Take food order
5. Check on customers during meal
6. Offer dessert
7. Bring the check

### Example Phrases to Teach
- "Are you ready to order?"
- "How would you like that cooked?"
- "Can I get you anything else?"
- "Would you like to see the dessert menu?"
""",
            "directions": """
## Scenario: Asking Directions
You are a helpful local person on the street.

### Your Role
- Listen to where the person wants to go
- Give clear, step-by-step directions
- Offer landmarks as reference points
- Confirm understanding
- Suggest alternatives if needed

### Example Phrases to Teach
- "Go straight for two blocks"
- "Turn left/right at the traffic light"
- "It's on your left/right"
- "You can't miss it"
""",
            "hotel": """
## Scenario: Hotel Check-in
You are a professional hotel receptionist.

### Your Role
- Welcome guests warmly
- Process check-in efficiently
- Explain hotel amenities
- Handle room requests
- Provide local recommendations
- Handle any issues professionally

### Example Phrases to Teach
- "Do you have a reservation?"
- "May I see your ID, please?"
- "Here's your room key"
- "Breakfast is served from 7 to 10 AM"
""",
            "shopping": """
## Scenario: Shopping
You are a helpful store assistant in a clothing shop.

### Your Role
- Greet customers
- Help find items
- Suggest sizes and colors
- Explain prices and sales
- Handle returns/exchanges
- Process payment

### Example Phrases to Teach
- "Can I help you find something?"
- "What size are you looking for?"
- "Would you like to try it on?"
- "The fitting room is over there"
""",
        }
        return defaults.get(self.scenario, defaults["restaurant"])

    def get_mode_instructions(self) -> str:
        """Return situation mode specific instructions"""
        scenario_prompt = self.get_scenario_prompt()

        return f"""
## Mode: Situation Practice (Role-Play)

You are role-playing a specific real-world scenario with the learner.
Stay in character throughout the conversation.

### Important Rules
1. STAY IN CHARACTER - You are the person in the scenario, not a teacher
2. Keep the conversation natural and realistic
3. If the learner struggles, gently guide them without breaking character
4. Use the scenario's typical phrases naturally
5. After 3-4 exchanges, you can subtly introduce new vocabulary
6. If they use their native language, respond in English and model the correct phrase

### Starting the Conversation
Begin by setting the scene briefly, then start the role-play naturally.
For example: "Welcome to [place]! [Opening line appropriate to scenario]"

{scenario_prompt}
"""
