const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface TokenResponse {
  token: string;
  user_id: string;
  api_key: string;
}

export interface CreateCallResponse {
  call_id: string;
  call_type: string;
  created: boolean;
}

export interface JoinCallResponse {
  status: string;
  call_id: string;
  message: string;
}

export async function getCallToken(userId?: string): Promise<TokenResponse> {
  const params = userId ? `?user_id=${userId}` : "";
  const response = await fetch(`${API_BASE_URL}/api/call/token${params}`);
  if (!response.ok) {
    throw new Error("Failed to get call token");
  }
  return response.json();
}

export async function createCall(callType: string = "default"): Promise<CreateCallResponse> {
  const response = await fetch(`${API_BASE_URL}/api/call/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ call_type: callType }),
  });
  if (!response.ok) {
    throw new Error("Failed to create call");
  }
  return response.json();
}

export async function joinCallWithAgent(callId: string): Promise<JoinCallResponse> {
  const response = await fetch(`${API_BASE_URL}/api/call/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ call_id: callId }),
  });
  if (!response.ok) {
    throw new Error("Failed to join call with agent");
  }
  return response.json();
}
