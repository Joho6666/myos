#!/usr/bin/env node

const configuredUrl = process.env.MYOS_URL?.trim();
const configuredPort = process.env.MYOS_PORT?.trim() || process.env.PORT?.trim() || "3000";
const baseUrl = (configuredUrl || `http://127.0.0.1:${configuredPort}`).replace(/\/$/, "");
const token = process.env.MYOS_CLI_TOKEN;

async function request(path, init = {}) {
  if (!token) throw new Error("MYOS_CLI_TOKEN 未配置。");
  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, { ...init, headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(init.headers || {}) } });
  } catch {
    throw new Error(`无法连接 MyOS：${baseUrl}。请通过 MYOS_URL 或 MYOS_PORT 指定当前服务端口。`);
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || `MyOS 返回 ${response.status}`);
  return body;
}

const tools = [
  { name: "myos_list_projects", description: "读取 MyOS 中的项目清单。", inputSchema: { type: "object", properties: {} } },
  { name: "myos_get_project_brief", description: "读取项目简介、技术栈、任务、Agent 工作项和最新汇报。", inputSchema: { type: "object", properties: { project: { type: "string" } }, required: ["project"] } },
  { name: "myos_create_agent_work", description: "为已在 MyOS 中登记的项目创建 Agent 工作项。", inputSchema: { type: "object", properties: { projectId: { type: "string" }, agentId: { type: "string", enum: ["codex", "claude-code", "opencode", "hermes", "openclaw"] }, title: { type: "string" }, instructions: { type: "string" } }, required: ["projectId", "agentId", "title"] } },
  { name: "myos_report_agent_progress", description: "提交 Agent 进度、阻塞原因、测试结果和变更文件，并更新关联工作项。", inputSchema: { type: "object", properties: { projectId: { type: "string" }, agentId: { type: "string", enum: ["codex", "claude-code", "opencode", "hermes", "openclaw"] }, progress: { type: "number", minimum: 0, maximum: 100 }, summary: { type: "string" }, workItemId: { type: "string" }, status: { type: "string", enum: ["queued", "in_progress", "blocked", "completed"] }, blockedReason: { type: "string" }, testResult: { type: "string" }, changedFiles: { type: "array", items: { type: "string" } }, artifactUrl: { type: "string" } }, required: ["projectId", "agentId", "progress", "summary"] } }
];

async function handle(message) {
  if (message.method === "initialize") return { protocolVersion: "2025-03-26", capabilities: { tools: {} }, serverInfo: { name: "myos-agent-os", version: "0.1.0" } };
  if (message.method === "tools/list") return { tools };
  if (message.method === "tools/call") {
    const args = message.params?.arguments || {};
    let output;
    if (message.params?.name === "myos_list_projects") output = await request("/api/agent-os/command");
    else if (message.params?.name === "myos_get_project_brief") output = await request(`/api/agent-os/command?project=${encodeURIComponent(args.project)}`);
    else if (message.params?.name === "myos_create_agent_work") output = await request("/api/agent-os/command", { method: "POST", body: JSON.stringify({ type: "addAgentWorkItem", payload: args }) });
    else if (message.params?.name === "myos_report_agent_progress") output = await request("/api/agent-os/command", { method: "POST", body: JSON.stringify({ type: "addAgentReport", payload: args }) });
    else throw new Error("未知 MyOS 工具。");
    return { content: [{ type: "text", text: JSON.stringify(output) }] };
  }
  return {};
}

let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", async (chunk) => {
  buffer += chunk;
  const lines = buffer.split("\n");
  buffer = lines.pop() || "";
  for (const line of lines) {
    if (!line.trim()) continue;
    let requestMessage;
    try {
      requestMessage = JSON.parse(line);
      const result = await handle(requestMessage);
      process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id: requestMessage.id, result })}\n`);
    } catch (error) {
      process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id: requestMessage?.id ?? null, error: { code: -32000, message: error instanceof Error ? error.message : "MyOS MCP 错误。" } })}\n`);
    }
  }
});
