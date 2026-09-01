import type { AgentExecution, ExecutionStatus, PermissionProfile } from "@/lib/data/models";

export type PythonAgentTarget = {
  id: string;
  label: string;
  registered: boolean;
  installed?: boolean;
  available: boolean;
  executionMode: "manual" | "adapter";
  version?: string | null;
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

function runtimeConnection() {
  const baseUrl = process.env.PYTHON_AGENT_BASE_URL?.trim() || defaultBaseUrl;
  const token = process.env.MYOS_PYTHON_AGENT_TOKEN?.trim();
  return { baseUrl, token };
}

async function fetchRuntime<T>(path: string, token: string | undefined, baseUrl: string, init?: RequestInit) {
  const headers: Record<string, string> = { accept: "application/json", ...(init?.headers as Record<string, string> | undefined) };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers,
    cache: "no-store",
    signal: init?.signal ?? AbortSignal.timeout(8000)
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.detail || body?.error || `Python Agent Runtime 返回 ${response.status}`);
  return body as T;
}

export async function getPythonAgentStatus(): Promise<PythonAgentStatus> {
  const { baseUrl, token } = runtimeConnection();
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

export function chooseAgent(options: {
  requested: string;
  preferred?: string;
  fallback?: string;
  agents: PythonAgentTarget[];
}) {
  const available = options.agents.filter((agent) => agent.available && agent.executionMode === "adapter");
  if (options.requested && options.requested !== "auto") {
    const match = options.agents.find((agent) => agent.id === options.requested);
    if (!match) return { agentId: options.requested, reason: "未知 Agent。", available: false };
    if (!match.available || match.executionMode !== "adapter") {
      return { agentId: match.id, reason: match.detail || "该 Agent 当前不可执行。", available: false };
    }
    return { agentId: match.id, reason: match.detail, available: true };
  }
  const preferred = available.find((agent) => agent.id === options.preferred);
  if (preferred) return { agentId: preferred.id, reason: "使用项目首选 Agent。", available: true };
  const fallback = available.find((agent) => agent.id === options.fallback);
  if (fallback) return { agentId: fallback.id, reason: "首选不可用，使用回退 Agent。", available: true };
  const codex = available.find((agent) => agent.id === "codex");
  if (codex) return { agentId: "codex", reason: "自动选择可用的 Codex。", available: true };
  if (available[0]) return { agentId: available[0].id, reason: "自动选择当前唯一可执行 Agent。", available: true };
  return { agentId: options.preferred || "codex", reason: "没有可执行的 Agent。请先安装并登录 Codex CLI，并启动 Python Agent Runtime。", available: false };
}

function mapExecution(raw: Record<string, unknown>): AgentExecution {
  const diff = (raw.diff as Record<string, unknown> | null) || null;
  const snapshot = (raw.snapshot as Record<string, unknown> | null) || null;
  return {
    id: String(raw.id || ""),
    workItemId: String(raw.workItemId || ""),
    projectId: String(raw.projectId || ""),
    projectName: String(raw.projectName || ""),
    agentId: String(raw.agentId || ""),
    title: String(raw.title || ""),
    instructions: String(raw.instructions || ""),
    workingDirectory: String(raw.workingDirectory || ""),
    permissionProfile: (raw.permissionProfile as PermissionProfile) || "standard",
    status: String(raw.status || "queued").toLowerCase() as ExecutionStatus,
    phase: String(raw.phase || raw.status || "queued"),
    createdAt: String(raw.createdAt || ""),
    updatedAt: String(raw.updatedAt || ""),
    startedAt: raw.startedAt ? String(raw.startedAt) : undefined,
    finishedAt: raw.finishedAt ? String(raw.finishedAt) : undefined,
    pid: typeof raw.pid === "number" ? raw.pid : undefined,
    exitCode: typeof raw.exitCode === "number" ? raw.exitCode : null,
    error: raw.error ? String(raw.error) : undefined,
    currentFile: raw.currentFile ? String(raw.currentFile) : undefined,
    latestAction: raw.latestAction ? String(raw.latestAction) : undefined,
    retryCount: Number(raw.retryCount || 0),
    maxRetries: Number(raw.maxRetries || 2),
    snapshot: snapshot
      ? { head: snapshot.head ? String(snapshot.head) : null, dirty: Boolean(snapshot.dirty), status: String(snapshot.status || ""), files: Array.isArray(snapshot.files) ? snapshot.files.map(String) : [] }
      : undefined,
    diff: diff
      ? {
          filesChanged: Number(diff.filesChanged || 0),
          additions: Number(diff.additions || 0),
          deletions: Number(diff.deletions || 0),
          files: Array.isArray(diff.files) ? diff.files.map(String) : [],
          patch: diff.patch ? String(diff.patch) : "",
          highRisk: Array.isArray(diff.highRisk) ? diff.highRisk.map(String) : []
        }
      : undefined,
    verification: Array.isArray(raw.verification)
      ? raw.verification.map((item) => {
          const row = item as Record<string, unknown>;
          return {
            name: String(row.name || "check"),
            command: Array.isArray(row.command) ? row.command.map(String) : [],
            ok: Boolean(row.ok),
            exitCode: typeof row.exitCode === "number" ? row.exitCode : null,
            output: row.output ? String(row.output) : ""
          };
        })
      : [],
    report: (raw.report as Record<string, unknown> | undefined) || undefined,
    approval: (raw.approval as AgentExecution["approval"]) || undefined,
    accepted: typeof raw.accepted === "boolean" ? raw.accepted : null
  };
}

async function requireRuntime() {
  const { baseUrl, token } = runtimeConnection();
  if (!token) throw new Error("Python Agent Runtime 未配置访问令牌。");
  return { baseUrl, token };
}

export async function listRuntimeExecutions(): Promise<AgentExecution[]> {
  const { baseUrl, token } = await requireRuntime();
  const body = await fetchRuntime<{ executions?: Record<string, unknown>[] }>("/executions", token, baseUrl);
  return (body.executions || []).map(mapExecution);
}

export async function getRuntimeExecution(id: string): Promise<AgentExecution> {
  const { baseUrl, token } = await requireRuntime();
  const body = await fetchRuntime<{ execution: Record<string, unknown> }>(`/executions/${id}`, token, baseUrl);
  return mapExecution(body.execution);
}

export async function getRuntimeLogs(id: string, after = -1) {
  const { baseUrl, token } = await requireRuntime();
  const body = await fetchRuntime<{ logs: Array<{ seq: number; stream: string; text: string; createdAt: string }> }>(
    `/executions/${id}/logs?after=${after}`,
    token,
    baseUrl
  );
  return body.logs || [];
}

export async function startRuntimeExecution(payload: {
  projectId: string;
  agentId: string;
  title: string;
  instructions: string;
  workItemId?: string;
  workingDirectory?: string;
  permissionProfile?: PermissionProfile;
  maxRuntimeSeconds?: number;
  autoRetry?: number;
  verification?: Record<string, string[]>;
  context?: string;
}) {
  const { baseUrl, token } = await requireRuntime();
  const body = await fetchRuntime<Record<string, unknown>>("/executions", token, baseUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000)
  });
  return mapExecution(body);
}

export async function mutateRuntimeExecution(id: string, action: "stop" | "approve" | "accept" | "rollback", extra?: Record<string, string>) {
  const { baseUrl, token } = await requireRuntime();
  const body = await fetchRuntime<{ execution: Record<string, unknown> }>(`/executions/${id}/${action}`, token, baseUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(extra || {})
  });
  return mapExecution(body.execution);
}

export async function runtimeEventStream(id: string) {
  const { baseUrl, token } = await requireRuntime();
  return fetch(`${baseUrl.replace(/\/$/, "")}/executions/${id}/events`, {
    headers: { authorization: `Bearer ${token}`, accept: "text/event-stream" },
    cache: "no-store"
  });
}
