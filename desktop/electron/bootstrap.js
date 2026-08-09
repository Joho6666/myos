"use strict";

const fs = require("node:fs");
const crypto = require("node:crypto");
const net = require("node:net");
const paths = require("./paths");

const AGENT_PORT = 43110;

// 与 .env.example 保持一致的键顺序。桌面版首次启动生成空白模板：
// 安装包内不含任何密钥，用户在 /app/settings 里自行填写。
const ENV_TEMPLATE = `NEXT_PUBLIC_APP_NAME=MyOS
NEXT_PUBLIC_APP_URL=
OWNER_EMAIL=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_OWNER_USER_ID=
SUPABASE_STORAGE_BUCKET=myos-files

OPENAI_API_KEY=
OPENROUTER_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434

N8N_BASE_URL=
N8N_WEBHOOK_SECRET=
N8N_REQUEST_TIMEOUT_MS=30000

GITHUB_TOKEN=
NOTION_TOKEN=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
`;

function ensureDirs() {
  for (const dir of [paths.userDataDir, paths.logDir, paths.serverDataDir, paths.uploadDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function ensureEnvLocal() {
  if (!fs.existsSync(paths.envLocalPath)) {
    fs.writeFileSync(paths.envLocalPath, ENV_TEMPLATE, "utf8");
  }
}

/** 生成本地助手配置，token 每台机器随机，不进安装包。 */
function ensureAgentConfig() {
  if (fs.existsSync(paths.agentConfigPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(paths.agentConfigPath, "utf8"));
      if (existing.authToken && existing.authToken !== "replace-with-local-random-token") {
        return {
          token: String(existing.authToken),
          port: Number(existing.port) || AGENT_PORT
        };
      }
    } catch {
      // 配置损坏则重新生成
    }
  }

  const token = crypto.randomBytes(32).toString("hex");
  const config = {
    port: AGENT_PORT,
    authToken: token,
    allowedProjects: [],
    allowedScripts: [],
    ollamaBaseUrl: "http://127.0.0.1:11434"
  };
  fs.writeFileSync(paths.agentConfigPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  return { token, port: AGENT_PORT };
}

/** 解析 .env.local，语义与 src/lib/config/env-config.ts 的 parseEnv 保持一致。 */
function readEnvLocal() {
  const values = {};
  let raw = "";
  try {
    raw = fs.readFileSync(paths.envLocalPath, "utf8");
  } catch {
    return values;
  }

  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const value = match[2].trim();
    if (!value) continue;
    if (value.startsWith("\"") && value.endsWith("\"")) {
      try {
        values[match[1]] = JSON.parse(value);
        continue;
      } catch {
        values[match[1]] = value.slice(1, -1);
        continue;
      }
    }
    values[match[1]] = value.replace(/^'|'$/g, "");
  }
  return values;
}

/**
 * 找一个空闲端口。Next standalone 模板里 allowRetry: false，
 * 端口被占用会直接崩溃，必须由我们先探测。
 */
function findFreePort(preferred) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once("error", () => {
      // 首选端口被占用，交给系统随机分配
      const fallback = net.createServer();
      fallback.unref();
      fallback.once("error", reject);
      fallback.listen(0, "127.0.0.1", () => {
        const { port } = fallback.address();
        fallback.close(() => resolve(port));
      });
    });
    server.listen(preferred, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function isPortListening(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });
    socket.setTimeout(1000);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => resolve(false));
  });
}

module.exports = {
  AGENT_PORT,
  ensureDirs,
  ensureEnvLocal,
  ensureAgentConfig,
  readEnvLocal,
  findFreePort,
  isPortListening
};
