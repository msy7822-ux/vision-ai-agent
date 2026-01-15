const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type Difficulty = "beginner" | "intermediate" | "advanced";
export type Category = "daily" | "travel" | "business";
export type Speaker = "user" | "partner";

export interface ScriptLine {
  id: number;
  speaker: Speaker;
  text: string;
  notes?: string;
}

export interface Script {
  id: string;
  title: string;
  title_ja: string;
  description: string;
  difficulty: Difficulty;
  category: Category;
  estimated_minutes: number;
  lines: ScriptLine[];
}

export interface ScriptInfo {
  id: string;
  title: string;
  title_ja: string;
  description: string;
  difficulty: Difficulty;
  category: Category;
  estimated_minutes: number;
  line_count: number;
}

export interface ScriptsResponse {
  scripts: ScriptInfo[];
}

export interface ScriptResponse {
  script: Script;
}

export interface ScriptVoiceAgentConfigRequest {
  mode: "script";
  level: Difficulty;
  script_id: string;
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

export async function getScripts(): Promise<ScriptInfo[]> {
  const response = await fetch(`${API_BASE_URL}/api/coach/scripts`);
  if (!response.ok) {
    throw new Error(`Failed to fetch scripts: ${response.statusText}`);
  }
  const data: ScriptsResponse = await response.json();
  return data.scripts;
}

export async function getScript(scriptId: string): Promise<Script> {
  const response = await fetch(`${API_BASE_URL}/api/coach/scripts/${scriptId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch script: ${response.statusText}`);
  }
  const data: ScriptResponse = await response.json();
  return data.script;
}

export async function getScriptVoiceAgentConfig(
  request: ScriptVoiceAgentConfigRequest
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
