"use strict";

const { contextBridge, ipcRenderer } = require("electron");

// 只暴露必要的桌面能力，不开放任何 Node API 给页面。
contextBridge.exposeInMainWorld("myosDesktop", {
  isDesktop: true,
  getVersion: () => ipcRenderer.invoke("myos:version"),
  openDataDir: () => ipcRenderer.invoke("myos:open-data-dir"),
  showMainWindow: () => ipcRenderer.invoke("myos:show-main-window"),
  restartServices: () => ipcRenderer.invoke("myos:restart-services"),
  toggleFocusWindow: () => ipcRenderer.invoke("myos:toggle-focus-window"),
  getFocusWindowStatus: () => ipcRenderer.invoke("myos:focus-window-status")
});
