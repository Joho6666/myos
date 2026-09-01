import { createServer } from "node:http";
import { mkdir, readFile, rename, writeFile, readdir, realpath, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 桌面版把配置放在可写的用户数据目录，安装目录本身是只读的。
const configPath = process.env.MYOS_AGENT_CONFIG || path.join(__dirname, "agent.config.json");
const exampleConfigPath = path.join(__dirname, "agent.config.example.json");
const version = "0.1.0";
const applyConfirmation = "APPLY_MCP_CONFIGURATION";
const supportedAgents = new Set(["claude-code", "opencode"]);

async function readConfig() {
  const source = existsSync(configPath) ? configPath : exampleConfigPath;
  const raw = await readFile(source, "utf8");
  const config = JSON.parse(raw);
  return {
    port: Number(config.port || 43110),
    authToken: String(config.authToken || ""),
      allowedProjects: Array.isArray(config.allowedProjects) ? config.allowedProjects : [],
      allowedFileRoots: Array.isArray(config.allowedFileRoots) ? config.allowedFileRoots : [],
      allowedScripts: Array.isArray(config.allowedScripts) ? config.allowedScripts : [],
    ollamaBaseUrl: String(config.ollamaBaseUrl || "http://127.0.0.1:11434"),
    myosUrl: String(config.myosUrl || "http://127.0.0.1:3002")
  };
}

function publicFileRoots(roots) {
  return roots.map((root) => ({ id: String(root.id || ""), name: String(root.name || root.id || ""), path: String(root.path || "") }))
    .filter((root) => root.id && root.path);
}

async function resolveAllowedFile(rootId, requestedPath = "") {
  const root = publicFileRoots(config.allowedFileRoots).find((item) => item.id === rootId);
  if (!root) throw new Error("文件目录不在允许列表中。");
  const rootPath = await realpath(root.path);
  const candidate = await realpath(path.resolve(rootPath, requestedPath || "."));
  if (candidate !== rootPath && !candidate.startsWith(`${rootPath}${path.sep}`)) throw new Error("拒绝访问授权目录以外的文件。");
  return { root, path: candidate };
}

async function listFiles(rootId, requestedPath) {
  const target = await resolveAllowedFile(rootId, requestedPath);
  const entries = await readdir(target.path, { withFileTypes: true });
  return {
    root: { id: target.root.id, name: target.root.name },
    path: path.relative(await realpath(target.root.path), target.path).replaceAll("\\", "/"),
    entries: await Promise.all(entries.slice(0, 500).map(async (entry) => {
      const entryPath = path.join(target.path, entry.name);
      const info = await stat(entryPath);
      return { name: entry.name, path: path.relative(await realpath(target.root.path), entryPath).replaceAll("\\", "/"), kind: entry.isDirectory() ? "directory" : "file", size: info.size, modifiedAt: info.mtime.toISOString() };
    }))
  };
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(body));
}

function isAuthorized(request, token) {
  const header = request.headers.authorization || "";
  return Boolean(token) && header === `Bearer ${token}`;
}

async function ollamaStatus(baseUrl) {
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/tags`, { signal: AbortSignal.timeout(2500) });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      return { ok: false, message: `Ollama 返回 ${response.status}`, models: 0 };
    }
    return {
      ok: true,
      message: Array.isArray(body?.models) ? `Ollama 可用，发现 ${body.models.length} 个模型。` : "Ollama 可用。",
      models: Array.isArray(body?.models) ? body.models.length : 0
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Ollama 连接失败。",
      models: 0
    };
  }
}

function publicProjects(projects) {
  return projects.map((project) => ({
    id: String(project.id || ""),
    name: String(project.name || project.id || ""),
    path: String(project.path || ""),
    vscode: Boolean(project.vscode)
  })).filter((project) => project.id && project.path);
}

function getAllowedProject(projectId) {
  return publicProjects(config.allowedProjects).find((project) => project.id === projectId) || null;
}

function targetFor(agentId, projectPath) {
  if (agentId === "claude-code") return path.join(projectPath, ".mcp.json");
  if (agentId === "opencode") return path.join(projectPath, "opencode.json");
  return null;
}

function myosScriptPath() {
  return path.resolve(__dirname, "..", "tools", "myos-agent-mcp.mjs");
}

function mcpDefinition(agentId) {
  if (agentId === "claude-code") {
    return {
      command: "node",
      args: [myosScriptPath()],
      env: { MYOS_URL: config.myosUrl, MYOS_CLI_TOKEN: "${MYOS_CLI_TOKEN}" }
    };
  }

  return {
    type: "local",
    command: ["node", myosScriptPath()],
    environment: { MYOS_URL: config.myosUrl, MYOS_CLI_TOKEN: "{env:MYOS_CLI_TOKEN}" }
  };
}

async function readJsonObject(target) {
  if (!existsSync(target)) return { exists: false, value: {} };
  try {
    const parsed = JSON.parse(await readFile(target, "utf8"));
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error("配置根节点必须是对象。");
    return { exists: true, value: parsed };
  } catch (error) {
    throw new Error(`无法安全读取 ${path.basename(target)}：${error instanceof Error ? error.message : "JSON 格式错误"}`);
  }
}

function hasMyosMcp(agentId, value) {
  if (agentId === "claude-code") return Boolean(value?.mcpServers?.myos);
  return Boolean(value?.mcp?.servers?.myos);
}

async function previewAgentMcp(agentId, projectId) {
  if (!supportedAgents.has(agentId)) {
    return { supported: false, configured: false, agentId, detail: "该 Agent 的本地配置格式尚未纳入安全写入范围。" };
  }
  const project = getAllowedProject(projectId);
  if (!project) throw new Error("项目不在本地助手允许列表中。");
  const target = targetFor(agentId, project.path);
  const existing = await readJsonObject(target);
  const configured = hasMyosMcp(agentId, existing.value);
  return {
    supported: true,
    configured,
    agentId,
    project: { id: project.id, name: project.name },
    target: path.basename(target),
    targetExists: existing.exists,
    detail: configured ? "已检测到 MyOS MCP 配置。" : "将只新增或更新名为 myos 的 MCP 条目，不会修改其他配置。",
    confirmation: configured ? null : applyConfirmation
  };
}

async function backupFile(target) {
  if (!existsSync(target)) return null;
  const backupDirectory = path.join(path.dirname(configPath), "backups");
  await mkdir(backupDirectory, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backup = path.join(backupDirectory, `${path.basename(target)}.${stamp}.bak`);
  await writeFile(backup, await readFile(target));
  return path.basename(backup);
}

async function applyAgentMcp(agentId, projectId, confirmation) {
  const preview = await previewAgentMcp(agentId, projectId);
  if (!preview.supported) throw new Error(preview.detail);
  if (preview.configured) return { ...preview, applied: false, detail: "MyOS MCP 已经配置，无需重复写入。" };
  if (confirmation !== applyConfirmation) throw new Error("请使用明确确认后再写入本地配置。");

  const project = getAllowedProject(projectId);
  const target = targetFor(agentId, project.path);
  const existing = await readJsonObject(target);
  const next = structuredClone(existing.value);
  if (agentId === "claude-code") {
    next.mcpServers = { ...(next.mcpServers || {}), myos: mcpDefinition(agentId) };
  } else {
    next.mcp = { ...(next.mcp || {}), servers: { ...(next.mcp?.servers || {}), myos: mcpDefinition(agentId) } };
  }

  const backup = await backupFile(target);
  const temporary = `${target}.myos-tmp`;
  await writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  await rename(temporary, target);
  return { ...(await previewAgentMcp(agentId, projectId)), applied: true, backup, detail: "MyOS MCP 已写入项目配置。请重启对应 Agent，并在环境中配置 MYOS_CLI_TOKEN。" };
}

async function readRequestBody(request) {
  let raw = "";
  for await (const chunk of request) raw += chunk;
  if (raw.length > 10_000) throw new Error("请求内容过大。");
  try { return JSON.parse(raw || "{}"); } catch { throw new Error("请求 JSON 格式错误。"); }
}

const config = await readConfig();
if (!config.authToken || config.authToken === "replace-with-local-random-token") {
  console.warn("[MyOS Local Agent] agent.config.json is missing a real authToken. Create one before connecting MyOS.");
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", "http://127.0.0.1");

    if (!isAuthorized(request, config.authToken)) {
      sendJson(response, 401, { error: "本地助手认证失败。" });
      return;
    }

    if (request.method === "GET" && url.pathname === "/health") {
      sendJson(response, 200, { ok: true, name: "MyOS Local Agent", version });
      return;
    }

    if (request.method === "GET" && url.pathname === "/ollama/status") {
      sendJson(response, 200, await ollamaStatus(config.ollamaBaseUrl));
      return;
    }

    if (request.method === "GET" && url.pathname === "/projects") {
      sendJson(response, 200, { projects: publicProjects(config.allowedProjects) });
      return;
    }

    if (request.method === "GET" && url.pathname === "/files/roots") {
      sendJson(response, 200, { roots: publicFileRoots(config.allowedFileRoots).map(({ id, name }) => ({ id, name })) });
      return;
    }

    if (request.method === "GET" && url.pathname === "/files/list") {
      sendJson(response, 200, await listFiles(url.searchParams.get("root") || "", url.searchParams.get("path") || ""));
      return;
    }

    if (request.method === "GET" && url.pathname === "/files/read") {
      const target = await resolveAllowedFile(url.searchParams.get("root") || "", url.searchParams.get("path") || "");
      const info = await stat(target.path);
      if (!info.isFile() || info.size > 25 * 1024 * 1024) throw new Error("只能下载授权目录中的文件，且单次不超过 25MB。");
      response.writeHead(200, { "content-type": "application/octet-stream", "content-length": info.size, "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(path.basename(target.path))}`, "cache-control": "no-store" });
      response.end(await readFile(target.path));
      return;
    }

    if (request.method === "POST" && url.pathname === "/agent-mcp/preview") {
      const body = await readRequestBody(request);
      sendJson(response, 200, await previewAgentMcp(String(body.agentId || ""), String(body.projectId || "")));
      return;
    }

    if (request.method === "POST" && url.pathname === "/agent-mcp/apply") {
      const body = await readRequestBody(request);
      sendJson(response, 200, await applyAgentMcp(String(body.agentId || ""), String(body.projectId || ""), String(body.confirmation || "")));
      return;
    }

    sendJson(response, 404, { error: "本地助手没有这个接口。" });
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : "本地助手内部错误。" });
  }
});

server.listen(config.port, "127.0.0.1", () => {
  console.log(`[MyOS Local Agent] listening on http://127.0.0.1:${config.port}`);
});
