export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export type OllamaStatus = {
  reachable: boolean;
  base_url: string;
  models: string[];
  required: {
    llm: string;
    vision: string;
    embedding: string;
  };
  required_status: Record<string, boolean>;
  ready: boolean;
};

export type HealthResponse = {
  status: string;
  ollama: OllamaStatus;
  chroma: { host: string; port: number };
};

export async function getHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getOllamaStatus(): Promise<OllamaStatus> {
  const res = await fetch(`${API_BASE}/ollama/status`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function ensureOllamaModels(): Promise<void> {
  const res = await fetch(`${API_BASE}/ollama/ensure`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
}
