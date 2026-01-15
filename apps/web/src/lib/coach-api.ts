const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface VoiceAgentConfigRequest {
  mode: "freetalk" | "pronunciation" | "situation";
  level: "beginner" | "intermediate" | "advanced";
  scenario?: string;
}

export interface VoiceAgentConfigResponse {
  api_key: string;
  prompt: string;
  greeting: string;
  voice: string;
  listen_model: string;
  think_provider: string;
  think_model: string;
}

export async function getVoiceAgentConfig(
  request: VoiceAgentConfigRequest
): Promise<VoiceAgentConfigResponse> {
  const response = await fetch(`${API_BASE_URL}/api/coach/voice-agent/config`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    throw new Error(`Failed to get voice agent config: ${response.statusText}`);
  }
  return response.json();
}
