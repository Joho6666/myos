"use client";

import { FolderOpen, MonitorCog, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

export function DesktopSystemPanel() {
  const [desktop, setDesktop] = useState(false);
  const [version, setVersion] = useState("");
  const [restarting, setRestarting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!window.myosDesktop?.isDesktop) return;
    setDesktop(true);
    void window.myosDesktop.getVersion().then(setVersion).catch(() => setVersion("未知"));
  }, []);

  if (!desktop) return null;

  async function restart() {
    setRestarting(true);
    setMessage("");
    try {
      const result = await window.myosDesktop?.restartServices();
      setMessage(result?.ready ? "本地服务已重启。" : "本地服务未能启动，请查看日志。");
    } finally { setRestarting(false); }
  }

  return <section className="panel">
    <div className="panel-header"><h2>桌面应用</h2><span className="badge success">v{version || "…"}</span></div>
    <div className="table-list">
      <div className="row"><span><span className="row-title">专注浮窗</span><span className="row-subtitle">快捷键 Ctrl + Alt + Space</span></span><MonitorCog size={16} aria-hidden /></div>
      <div className="row"><span><span className="row-title">应用数据</span><span className="row-subtitle">打开本机 MyOS 数据目录。</span></span><button className="icon-button" type="button" onClick={() => void window.myosDesktop?.openDataDir()} title="打开数据目录" aria-label="打开数据目录"><FolderOpen size={15} aria-hidden /></button></div>
      <div className="row"><span><span className="row-title">本地服务</span><span className="row-subtitle">重启应用内的 MyOS 与本地助手服务。</span></span><button className="icon-button" type="button" onClick={() => void restart()} disabled={restarting} title="重启本地服务" aria-label="重启本地服务"><RefreshCw className={restarting ? "spin" : ""} size={15} aria-hidden /></button></div>
    </div>
    {message ? <p className="config-message">{message}</p> : null}
  </section>;
}
