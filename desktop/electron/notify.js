"use strict";

const { Notification } = require("electron");

function notify(title, body, onClick) {
  if (!Notification.isSupported()) return;
  try {
    const notification = new Notification({ title, body, silent: false });
    if (typeof onClick === "function") notification.on("click", onClick);
    notification.show();
  } catch {
    // 通知失败不应影响主流程
  }
}

module.exports = {
  notify,
  notifyReady: (port) => notify("MyOS 已就绪", `本地服务运行在 127.0.0.1:${port}`),
  notifyStartFailed: (reason) => notify("MyOS 启动失败", reason),
  notifyAgentOffline: () => notify("本地助手未启动", "MyOS 仍可使用，但本地助手功能不可用。"),
  notifyExecution: (title, body) => notify(title, body)
};
