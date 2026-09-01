"use strict";

const { app, BrowserWindow, ipcMain, shell, dialog, globalShortcut } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const paths = require("./paths");
const bootstrap = require("./bootstrap");
const services = require("./services");
const trayModule = require("./tray");
const notify = require("./notify");

// Windows 通知与任务栏归组必须设置 AppUserModelId
app.setAppUserModelId("com.myos.desktop");

const startHidden = process.argv.includes("--hidden");

let mainWindow = null;
let focusWindow = null;
let activePort = null;
let isQuitting = false;
let stateSaveTimer = null;

const defaultWindowState = { width: 1440, height: 900, x: undefined, y: undefined, maximized: false };

function windowStatePath() {
  return path.join(paths.userDataDir, "window-state.json");
}

function readWindowState() {
  try {
    const stored = JSON.parse(fs.readFileSync(windowStatePath(), "utf8"));
    const width = Number(stored.width);
    const height = Number(stored.height);
    if (width < 960 || height < 640) return defaultWindowState;
    return { width, height, x: Number.isFinite(stored.x) ? stored.x : undefined, y: Number.isFinite(stored.y) ? stored.y : undefined, maximized: Boolean(stored.maximized) };
  } catch {
    return defaultWindowState;
  }
}

function saveWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const bounds = mainWindow.getBounds();
  const next = { ...bounds, maximized: mainWindow.isMaximized() };
  try { fs.writeFileSync(windowStatePath(), `${JSON.stringify(next, null, 2)}\n`, "utf8"); } catch { /* state persistence must not disrupt MyOS */ }
}

function scheduleWindowStateSave() {
  if (stateSaveTimer) clearTimeout(stateSaveTimer);
  stateSaveTimer = setTimeout(saveWindowState, 350);
}

const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) {
  app.quit();
  return;
}

app.on("second-instance", () => {
  showWindow();
});

function showWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

async function loadFocusWindow() {
  if (!focusWindow || !activePort) return;
  await focusWindow.loadURL(`http://127.0.0.1:${activePort}/focus`);
}

function createFocusWindow() {
  if (focusWindow) return focusWindow;

  focusWindow = new BrowserWindow({
    width: 370,
    height: 520,
    minWidth: 320,
    minHeight: 400,
    show: false,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: "#00000000",
    title: "MyOS 专注浮窗",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  focusWindow.setAlwaysOnTop(true, "floating");
  focusWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  focusWindow.on("close", (event) => {
    if (isQuitting) return;
    event.preventDefault();
    focusWindow.hide();
  });
  focusWindow.on("closed", () => { focusWindow = null; });
  focusWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  return focusWindow;
}

async function toggleFocusWindow() {
  const window = createFocusWindow();
  if (window.isVisible()) {
    window.hide();
    return { visible: false };
  }
  await loadFocusWindow();
  window.show();
  window.focus();
  return { visible: true };
}

function createWindow() {
  const state = readWindowState();
  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 960,
    minHeight: 640,
    show: !startHidden,
    backgroundColor: "#fafafa",
    title: "MyOS",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "loading.html"));
  if (state.maximized) mainWindow.maximize();

  // 外链交给系统浏览器，不在应用内开新窗口
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // 关闭窗口只隐藏到托盘，真正退出走托盘菜单
  mainWindow.on("close", (event) => {
    if (isQuitting) return;
    event.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  mainWindow.on("resize", scheduleWindowStateSave);
  mainWindow.on("move", scheduleWindowStateSave);
  mainWindow.on("maximize", scheduleWindowStateSave);
  mainWindow.on("unmaximize", scheduleWindowStateSave);
}

async function startServices() {
  try {
    services.startLocalAgent();
  } catch (error) {
    notify.notifyAgentOffline();
    logError("local-agent 启动失败", error);
  }

  const port = await services.startWebServer();
  const ready = await services.waitForServer(port);

  if (!ready) {
    notify.notifyStartFailed("本地服务未能在预期时间内启动，请查看日志。");
    if (mainWindow) {
      const choice = dialog.showMessageBoxSync(mainWindow, {
        type: "error",
        title: "MyOS 启动失败",
        message: "本地服务未能启动。",
        detail: `日志目录：\n${paths.logDir}`,
        buttons: ["打开日志目录", "关闭"],
        defaultId: 0
      });
      if (choice === 0) shell.openPath(paths.logDir);
    }
    return;
  }

  activePort = port;
  if (mainWindow) {
    await mainWindow.loadURL(`http://127.0.0.1:${port}/app`);
  }
  notify.notifyReady(port);
  startExecutionWatch();
}

function logError(label, error) {
  try {
    fs.appendFileSync(
      path.join(paths.logDir, "desktop.log"),
      `[${new Date().toISOString()}] ${label}: ${error && error.stack ? error.stack : error}\n`,
      "utf8"
    );
  } catch {
    // 日志写入失败不应影响主流程
  }
}

let executionWatchTimer = null;
const seenExecutions = new Map();

function startExecutionWatch() {
  if (executionWatchTimer) clearInterval(executionWatchTimer);
  executionWatchTimer = setInterval(() => {
    const env = bootstrap.readEnvLocal();
    const token = env.MYOS_PYTHON_AGENT_TOKEN;
    if (!token) {
      trayModule.setTooltip("MyOS");
      return;
    }
    const request = http.get(
      { host: "127.0.0.1", port: 43200, path: "/executions", headers: { authorization: `Bearer ${token}` }, timeout: 2500 },
      (response) => {
        let raw = "";
        response.on("data", (chunk) => { raw += chunk; });
        response.on("end", () => {
          try {
            const body = JSON.parse(raw);
            const executions = Array.isArray(body.executions) ? body.executions : [];
            const running = executions.filter((item) => ["RUNNING", "PREPARING", "VERIFYING", "QUEUED"].includes(String(item.status || "").toUpperCase()));
            trayModule.setTooltip(`MyOS · Running Agents: ${running.length}`);
            for (const item of executions) {
              const status = String(item.status || "").toUpperCase();
              const previous = seenExecutions.get(item.id);
              seenExecutions.set(item.id, status);
              if (previous && previous !== status && (status === "COMPLETED" || status === "FAILED")) {
                notify.notifyExecution("MyOS", `${item.agentId || "Agent"} ${status === "COMPLETED" ? "已完成" : "失败"}：${item.title || "执行任务"}`, () => {
                  showWindow();
                  if (mainWindow && activePort && item.id) {
                    mainWindow.loadURL(`http://127.0.0.1:${activePort}/app/executions/${item.id}`);
                  }
                });
              }
            }
          } catch {
            trayModule.setTooltip("MyOS");
          }
        });
      }
    );
    request.on("error", () => trayModule.setTooltip("MyOS"));
    request.on("timeout", () => request.destroy());
  }, 8000);
}

function registerIpc() {
  ipcMain.handle("myos:version", () => app.getVersion());
  ipcMain.handle("myos:open-data-dir", () => shell.openPath(paths.userDataDir));
  ipcMain.handle("myos:show-main-window", () => { showWindow(); return { shown: true }; });
  ipcMain.handle("myos:restart-services", async () => {
    const result = await services.restartAll();
    if (result.ready && mainWindow) {
      activePort = result.port;
      await mainWindow.loadURL(`http://127.0.0.1:${result.port}/app`);
      await loadFocusWindow();
    }
    return result;
  });
  ipcMain.handle("myos:toggle-focus-window", async () => await toggleFocusWindow());
  ipcMain.handle("myos:focus-window-status", () => ({ available: Boolean(activePort), visible: Boolean(focusWindow?.isVisible()) }));
}

function quitApp() {
  isQuitting = true;
  saveWindowState();
  globalShortcut.unregisterAll();
  services.stopAll();
  if (focusWindow) focusWindow.destroy();
  trayModule.destroyTray();
  app.quit();
}

app.whenReady().then(async () => {
  bootstrap.ensureDirs();
  bootstrap.ensureEnvLocal();

  createWindow();
  registerIpc();

  const trayActions = {
    show: showWindow,
    toggleFocus: toggleFocusWindow,
    quit: quitApp,
    restart: async () => {
      if (mainWindow) {
        await mainWindow.loadFile(path.join(__dirname, "loading.html"));
      }
      const result = await services.restartAll();
      if (result.ready && mainWindow) {
        activePort = result.port;
        await mainWindow.loadURL(`http://127.0.0.1:${result.port}/app`);
        await loadFocusWindow();
      }
      trayModule.refreshTray(trayActions);
    }
  };
  trayModule.createTray(trayActions);
  globalShortcut.register("CommandOrControl+Alt+Space", () => { void toggleFocusWindow(); });

  try {
    await startServices();
  } catch (error) {
    logError("启动服务失败", error);
    notify.notifyStartFailed("启动过程中发生错误，请查看日志。");
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else showWindow();
  });
});

// 托盘常驻，关掉所有窗口不退出应用
app.on("window-all-closed", () => {});

app.on("before-quit", () => {
  isQuitting = true;
  saveWindowState();
  globalShortcut.unregisterAll();
  services.stopAll();
});

// 主进程被强杀时也尽量带走子进程
process.on("exit", () => services.stopAll());
