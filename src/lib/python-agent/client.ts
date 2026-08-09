export type PythonAgentTarget = {
  id: string;
  label: string;
  registered: boolean;
  available: boolean;
  executionMode: "manual" | "adapter";
  detail: string;
};

export type PythonAgentStatus = {
  configured: boolean;
  connected: boolean;
  message: string;
  baseUrl: string;
  version?: string;
  myosConfigured?: boolean;
  agents: PythonAgentTarget[];
};

const defaultBaseUrl = "http://127.0.0.1:43200";

async function fetchRuntime<T>(path: string, token: string | undefined, baseUrl: string) {
  const headers: Record<string, string> = { accept: "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(2500)
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.detail || body?.error || `Python Agent Runtime 返回 ${response.status}`);
  return body as T;
}

export async function getPythonAgentStatus(): Promise<PythonAgentStatus> {
  const baseUrl = process.env.PYTHON_AGENT_BASE_URL?.trim() || defaultBaseUrl;
  const token = process.env.MYOS_PYTHON_AGENT_TOKEN?.trim();
  const emptyAgents: PythonAgentTarget[] = [];

  if (!token) {
    return { configured: false, connected: false, message: "Python Agent Runtime 未配置访问令牌。", baseUrl, agents: emptyAgents };
  }

  try {
    const health = await fetchRuntime<{
      ok: boolean;
      version?: string;
      myosConfigured?: boolean;
    }>("/health", undefined, baseUrl);
    const runtime = await fetchRuntime<{ version?: string; agents?: PythonAgentTarget[] }>("/runtime", token, baseUrl);
    const myosConfigured = Boolean(health.myosConfigured);
    return {
      configured: true,
      connected: Boolean(health.ok),
      message: myosConfigured ? "Python Agent Runtime 已连接。" : "Runtime 已连接，但 MyOS CLI 令牌尚未配置。",
      baseUrl,
      version: runtime.version || health.version,
      myosConfigured,
      agents: runtime.agents || emptyAgents
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      message: `Python Agent Runtime 连接失败：${error instanceof Error ? error.message : "未知错误"}`,
      baseUrl,
      agents: emptyAgents
    };
  }
}
