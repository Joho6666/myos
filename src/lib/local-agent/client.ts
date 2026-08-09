export type LocalAgentProject = {
  id: string;
  name: string;
  path: string;
  vscode: boolean;
};

export type LocalAgentStatus = {
  configured: boolean;
  connected: boolean;
  message: string;
  health?: {
    ok: boolean;
    name?: string;
    version?: string;
  };
  ollama?: {
    ok: boolean;
    message: string;
    models?: number;
  };
  projects: LocalAgentProject[];
};

export type AgentMcpPreview = {
  supported: boolean;
  configured: boolean;
  applied?: boolean;
  agentId: string;
  project?: { id: string; name: string };
  target?: string;
  targetExists?: boolean;
  backup?: string | null;
  detail: string;
  confirmation?: string | null;
};

async function localAgentFetch<T>(path: string, baseUrl: string, token: string): Promise<T> {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/json"
    },
    cache: "no-store"
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error || `本地助手返回 ${response.status}`);
  }
  return body as T;
}

async function localAgentMutation<T>(path: string, body: Record<string, string>, baseUrl: string, token: string): Promise<T> {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store"
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.error || `本地助手返回 ${response.status}`);
  return result as T;
}

function localAgentConnection() {
  const baseUrl = process.env.LOCAL_AGENT_BASE_URL;
  const token = process.env.LOCAL_AGENT_TOKEN;
  if (!baseUrl || !token) throw new Error("本地助手未配置。");
  return { baseUrl, token };
}

export async function previewAgentMcpConfiguration(agentId: string, projectId: string): Promise<AgentMcpPreview> {
  const { baseUrl, token } = localAgentConnection();
  return await localAgentMutation<AgentMcpPreview>("/agent-mcp/preview", { agentId, projectId }, baseUrl, token);
}

export async function applyAgentMcpConfiguration(agentId: string, projectId: string, confirmation: string): Promise<AgentMcpPreview> {
  const { baseUrl, token } = localAgentConnection();
  return await localAgentMutation<AgentMcpPreview>("/agent-mcp/apply", { agentId, projectId, confirmation }, baseUrl, token);
}

export async function getLocalAgentStatus(): Promise<LocalAgentStatus> {
  const baseUrl = process.env.LOCAL_AGENT_BASE_URL;
  const token = process.env.LOCAL_AGENT_TOKEN;

  if (!baseUrl || !token) {
    return {
      configured: false,
      connected: false,
      message: "本地助手未配置。",
      projects: []
    };
  }

  try {
    const [health, ollama, projects] = await Promise.all([
      localAgentFetch<LocalAgentStatus["health"]>("/health", baseUrl, token),
      localAgentFetch<LocalAgentStatus["ollama"]>("/ollama/status", baseUrl, token),
      localAgentFetch<{ projects: LocalAgentProject[] }>("/projects", baseUrl, token)
    ]);

    return {
      configured: true,
      connected: Boolean(health?.ok),
      message: health?.ok ? "本地助手已连接。" : "本地助手状态异常。",
      health,
      ollama,
      projects: projects.projects || []
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      message: `本地助手连接失败：${error instanceof Error ? error.message : "未知错误"}`,
      projects: []
    };
  }
}
