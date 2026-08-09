#!/usr/bin/env node

const configuredUrl = process.env.MYOS_URL?.trim();
const configuredPort = process.env.MYOS_PORT?.trim() || process.env.PORT?.trim() || "3000";
const baseUrl = (configuredUrl || `http://127.0.0.1:${configuredPort}`).replace(/\/$/, "");
const token = process.env.MYOS_CLI_TOKEN;
const [, , command = "help", ...args] = process.argv;

function option(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function usage() {
  console.log("MyOS Agent CLI\n\nmyos-agent list\nmyos-agent brief <project-id-or-name>\nmyos-agent work <project-id> --agent codex --title \"...\" [--instructions \"...\"]\nmyos-agent report <project-id> --agent codex --progress 60 --summary \"...\" [--work <work-item-id>] [--status in_progress] [--blocked \"...\"] [--test \"...\"] [--files \"a.ts,b.ts\"]");
}

async function request(path, init = {}) {
  if (!token) throw new Error("MYOS_CLI_TOKEN 未配置。请在本机环境中设置后重试。");
  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(init.headers || {}) }
    });
  } catch {
    throw new Error(`无法连接 MyOS：${baseUrl}。如果开发服务运行在其他端口，请设置 MYOS_URL 或 MYOS_PORT。`);
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || `MyOS 返回 ${response.status}`);
  return body;
}

try {
  if (command === "list") {
    console.log(JSON.stringify(await request("/api/agent-os/command"), null, 2));
  } else if (command === "brief") {
    const project = args[0];
    if (!project) throw new Error("请提供项目 ID 或项目名。");
    console.log(JSON.stringify(await request(`/api/agent-os/command?project=${encodeURIComponent(project)}`), null, 2));
  } else if (command === "work") {
    const projectId = args[0];
    const agentId = option("--agent");
    const title = option("--title");
    if (!projectId || !agentId || !title) throw new Error("work 需要项目 ID、--agent 和 --title。");
    await request("/api/agent-os/command", { method: "POST", body: JSON.stringify({ type: "addAgentWorkItem", payload: { projectId, agentId, title, instructions: option("--instructions") || "" } }) });
    console.log("工作项已创建。");
  } else if (command === "report") {
    const projectId = args[0];
    const agentId = option("--agent");
    const summary = option("--summary");
    const progress = Number(option("--progress"));
    if (!projectId || !agentId || !summary || !Number.isFinite(progress)) throw new Error("report 需要项目 ID、--agent、--progress 和 --summary。");
    const status = option("--status");
    const blockedReason = option("--blocked");
    const testResult = option("--test");
    const changedFiles = option("--files")?.split(",").map((item) => item.trim()).filter(Boolean);
    const artifactUrl = option("--artifact");
    await request("/api/agent-os/command", { method: "POST", body: JSON.stringify({ type: "addAgentReport", payload: { projectId, agentId, workItemId: option("--work"), summary, progress, status, blockedReason, testResult, changedFiles, artifactUrl } }) });
    console.log("Agent 汇报已保存。");
  } else {
    usage();
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Agent CLI 执行失败。");
  process.exitCode = 1;
}
