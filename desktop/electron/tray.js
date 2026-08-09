"use strict";

const { Tray, Menu, app, shell, nativeImage } = require("electron");
const path = require("node:path");
const paths = require("./paths");

let tray = null;

function trayIcon() {
  const iconPath = paths.isPackaged
    ? path.join(process.resourcesPath, "icon.png")
    : path.join(paths.projectRoot, "desktop", "build", "icon.png");
  const image = nativeImage.createFromPath(iconPath);
  return image.isEmpty() ? nativeImage.createEmpty() : image.resize({ width: 16, height: 16 });
}

function buildMenu(actions) {
  return Menu.buildFromTemplate([
    { label: "打开 MyOS", click: actions.show },
    { label: "显示 / 隐藏专注浮窗", click: actions.toggleFocus },
    { type: "separator" },
    { label: "重启 MyOS 服务", click: actions.restart },
    {
      label: "开机启动",
      type: "checkbox",
      checked: app.getLoginItemSettings().openAtLogin,
      click: (item) => {
        app.setLoginItemSettings({
          openAtLogin: item.checked,
          args: ["--hidden"]
        });
      }
    },
    { type: "separator" },
    { label: "打开数据目录", click: () => shell.openPath(paths.userDataDir) },
    { label: "打开日志目录", click: () => shell.openPath(paths.logDir) },
    { type: "separator" },
    { label: "退出 MyOS", click: actions.quit }
  ]);
}

function createTray(actions) {
  if (tray) return tray;

  tray = new Tray(trayIcon());
  tray.setToolTip("MyOS");
  tray.setContextMenu(buildMenu(actions));
  tray.on("double-click", actions.show);
  return tray;
}

function refreshTray(actions) {
  if (tray) tray.setContextMenu(buildMenu(actions));
}

function destroyTray() {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

module.exports = { createTray, refreshTray, destroyTray };
