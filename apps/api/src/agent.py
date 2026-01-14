import logging
from pathlib import Path

from vision_agents.core import Agent, User, cli
from vision_agents.plugins import gemini, getstream

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 指示ファイルのパス
INSTRUCTIONS_PATH = Path(__file__).parent / "object_detector.md"

# エージェントへの指示（映像を見て英語で物体名を発話）
INSTRUCTIONS = """
You are a real-time object identification assistant watching a live video feed.

## Your Task:
Identify and announce ONLY physical objects you can clearly see in the video.

## Rules for Identifying Objects:
1. ONLY announce objects you can CLEARLY see in the current frame
2. Be SPECIFIC: say "laptop" not "computer", "coffee mug" not "container"
3. Focus on the 2-4 MOST PROMINENT objects that take up significant space in the frame
4. DO NOT guess or imagine objects that might be there
5. DO NOT announce abstract concepts, backgrounds, or environments

## Response Format:
- Keep it SHORT: "I see a laptop, a coffee mug, and a smartphone"
- Use articles: "a" for singular, "some" for plural
- Pronounce clearly and naturally

## What to Announce:
- Electronics: laptop, smartphone, keyboard, mouse, monitor, tablet
- Furniture: chair, desk, table, lamp, shelf
- Personal items: book, pen, glasses, watch, bag, wallet
- Food/Drink: cup, bottle, plate, bowl, fruit, snack
- People: person, hand, face (if visible)

## What NOT to Announce:
- Walls, floors, ceilings, windows (background elements)
- Colors, lighting, shadows
- Emotions, moods, atmospheres
- Objects you're not sure about

## Speaking Style:
- Speak clearly in American English
- Natural pace, not too fast
- Brief pause between objects
"""


def create_agent() -> Agent:
    """物体検出エージェントを作成"""
    agent = Agent(
        edge=getstream.Edge(),
        agent_user=User(name="Object Detector", id="object-detector-agent"),
        instructions=INSTRUCTIONS,
        llm=gemini.Realtime(fps=1),  # 1FPSに下げてメモリ使用量削減
    )

    return agent


class ObjectDetectorLauncher:
    """エージェントランチャー"""

    def create_agent(self) -> Agent:
        return create_agent()

    async def join_call(self, agent: Agent, call_id: str):
        """通話に参加してオブジェクト検出を開始"""
        logger.info(f"Joining call: {call_id}")

        call = await agent.create_call(
            call_type="default",
            call_id=call_id,
        )

        async with agent.join(call):
            await agent.simple_response(
                "I can see the video now. Let me tell you what objects I see."
            )
            await agent.finish()


if __name__ == "__main__":
    cli(ObjectDetectorLauncher())
