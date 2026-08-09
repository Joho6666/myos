"use strict";

const { app } = require("electron");
const path = require("node:path");

const isPackaged = app.isPackaged;

// 打包后：resources/app 是 Next standalone 输出，resources/local-agent 是本地助手。
// 开发态：直接指向仓库里的 .next/standalone 和 local-agent。
const projectRoot = path.resolve(__dirname, "..", "..");

const resourcesRoot = isPackaged ? process.resourcesPath : projectRoot;

const standaloneDir = isPackaged
  ? path.join(resourcesRoot, "app")
  : path.join(projectRoot, ".next", "standalone");

const localAgentDir = isPackaged
  ? path.join(resourcesRoot, "local-agent")
  : path.join(projectRoot, "local-agent");

const serverEntry = path.join(standaloneDir, "server.js");
const localAgentEntry = path.join(localAgentDir, "server.mjs");

// userData 由 electron-builder.yml 的 productName (MyOS) 决定，即 %APPDATA%\MyOS
const userDataDir = app.getPath("userData");

module.exports = {
  isPackaged,
  projectRoot,
  standaloneDir,
  localAgentDir,
  serverEntry,
  localAgentEntry,
  userDataDir,
  envLocalPath: path.join(userDataDir, ".env.local"),
  agentConfigPath: path.join(userDataDir, "agent.config.json"),
  logDir: path.join(userDataDir, "logs"),
  serverDataDir: path.join(userDataDir, "server-data"),
  uploadDir: path.join(userDataDir, "uploads")
};
