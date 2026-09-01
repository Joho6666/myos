"use strict";

const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { spawn, spawnSync } = require("node:child_process");
const paths = require("./paths");
const bootstrap = require("./bootstrap");

let webProcess = null;
let agentProcess = null;
let pythonProcess = null;
let webPort = 0;
let agentInfo = null;
let pythonInfo = null;

function openLog(name) {
  return fs.openSync(path.join(paths.logDir, `${name}.log`), "a");
}

/**
 * 用 Electron 自带的 Node 运行子进程（ELECTRON_RUN_AS_NODE=1），
 * 目标机器不需要安装 Node 或 pnpm。
 */
function spawnNode(entry, options) {
  const out = openLog(options.logName);
  const child = spawn(process.execPath, [entry], {
    cwd: options.cwd,
    env: { ...options.env, ELECTRON_RUN_AS_NODE: "1" },
    stdio: ["ignore", out, out],
    windowsHide: true
  });
  child.on("exit", (code, signal) => {
    if (options.onExit) options.onExit(code, signal);
  });
  return child;
}

function startLocalAgent() {
  agentInfo = bootstrap.ensureAgentConfig();

  agentProcess = spawnNode(paths.localAgentEntry, {
    cwd: paths.localAgentDir,
    logName: "local-agent",
    env: {
      ...process.env,
      MYOS_AGENT_CONFIG: paths.agentConfigPath,
      NODE_ENV: "production"
    },
    onExit: () => {
      agentProcess = null;
    }
  });

  return agentInfo;
}

async function startWebServer() {
  webPort = await bootstrap.findFreePort(3010);
  const fileEnv = bootstrap.readEnvLocal();

  webProcess = spawnNode(paths.serverEntry, {
    cwd: paths.standaloneDir,
    logName: "myos-web",
    env: {
      ...process.env,
      ...fileEnv,
      // 桌面版可写数据目录 —— src/server/paths.ts 读这个变量
      MYOS_DATA_DIR: paths.userDataDir,
      PORT: String(webPort),
      HOSTNAME: "0.0.0.0",
      NODE_ENV: "production",
      // 本地助手连接信息由主进程注入，用户无需手动配置 token
      LOCAL_AGENT_BASE_URL: `http://127.0.0.1:${agentInfo ? agentInfo.port : bootstrap.AGENT_PORT}`,
      LOCAL_AGENT_TOKEN: agentInfo ? agentInfo.token : "",
      PYTHON_AGENT_BASE_URL: "http://127.0.0.1:43200",
      MYOS_PYTHON_AGENT_TOKEN: pythonInfo ? pythonInfo.token : fileEnv.MYOS_PYTHON_AGENT_TOKEN || "",
      MYOS_AGENT_CONFIG: paths.agentConfigPath,
      NEXT_PUBLIC_APP_URL: fileEnv.NEXT_PUBLIC_APP_URL || `http://127.0.0.1:${webPort}`
    },
    onExit: () => {
      webProcess = null;
    }
  });

  return webPort;
}

/** 轮询直到 Next 服务端能响应，再让窗口跳转过去。 */
function waitForServer(port, timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs;

  return new Promise((resolve) => {
    const attempt = () => {
      if (Date.now() > deadline) {
        resolve(false);
        return;
      }
      if (!webProcess) {
        resolve(false);
        return;
      }

      const request = http.get(
        { host: "127.0.0.1", port, path: "/login", timeout: 2000 },
        (response) => {
          response.resume();
          if (response.statusCode && response.statusCode < 500) {
            resolve(true);
          } else {
            setTimeout(attempt, 500);
          }
        }
      );
      request.on("timeout", () => {
        request.destroy();
        setTimeout(attempt, 500);
      });
      request.on("error", () => setTimeout(attempt, 500));
    };

    attempt();
  });
}

/**
 * Windows 上 child.kill() 只终止直接子进程，Next standalone 派生的
 * 工作进程会残留并占用端口，必须用 taskkill 连同进程树一起结束。
 */
function killProcessTree(child) {
  if (!child || child.killed || !child.pid) return;
  if (process.platform === "win32") {
    try {
      spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    } catch {
      // 进程可能已退出
    }
    return;
  }
  try {
    child.kill("SIGTERM");
  } catch {
    // 进程可能已退出
  }
}

function stopAll() {
  for (const child of [webProcess, agentProcess, pythonProcess]) {
    killProcessTree(child);
  }
  webProcess = null;
  agentProcess = null;
  pythonProcess = null;
}

async function restartAll() {
  stopAll();
  startLocalAgent();
  const port = await startWebServer();
  const ready = await waitForServer(port);
  return { port, ready };
}

module.exports = {
  startLocalAgent,
  startWebServer,
  waitForServer,
  stopAll,
  restartAll,
  getWebPort: () => webPort,
  getAgentInfo: () => agentInfo,
  getPythonInfo: () => pythonInfo,
  isWebRunning: () => Boolean(webProcess),
  isAgentRunning: () => Boolean(agentProcess),
  isPythonRunning: () => Boolean(pythonProcess)
};
