const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface TokenResponse {
  token: string;
  user_id: string;
  api_key: string;
}

export interface CreateCoachCallRequest {
  mode: "freetalk" | "pronunciation" | "situation";
  level: "beginner" | "intermediate" | "advanced";
  scenario?: string;
}

export interface CreateCoachCallResponse {
  call_id: string;
  mode: string;
  level: string;
  scenario?: string;
}

export interface JoinCoachCallResponse {
  status: string;
  call_id: string;
  message: string;
}

export async function getCallToken(): Promise<TokenResponse> {
  const response = await fetch(`${API_BASE_URL}/api/call/token`);
  if (!response.ok) {
    throw new Error(`Failed to get token: ${response.statusText}`);
  }
  return response.json();
}

export async function createCoachCall(
  request: CreateCoachCallRequest
): Promise<CreateCoachCallResponse> {
  const response = await fetch(`${API_BASE_URL}/api/coach/session/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    throw new Error(`Failed to create coach call: ${response.statusText}`);
  }
  return response.json();
}

export async function joinCoachCall(
  callId: string
): Promise<JoinCoachCallResponse> {
  const response = await fetch(`${API_BASE_URL}/api/coach/session/${callId}/join`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to join coach call: ${response.statusText}`);
  }
  return response.json();
}
