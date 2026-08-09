"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, FolderKanban, MonitorCog, RefreshCw, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import type { LocalAgentStatus } from "@/lib/local-agent/client";

export default function LocalAgentPage() {
  const [status, setStatus] = useState<LocalAgentStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/local-agent/status", { cache: "no-store" });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || "读取本地助手状态失败。");
      setStatus(body);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "读取本地助手状态失败。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const agentBadge = status?.connected ? "success" : status?.configured ? "failed" : "warning";

  return (
    <>
      <div className="workspace-hero">
        <div className="hero-copy">
          <h1>本地助手</h1>
          <p>连接这台 Windows 电脑上的本地能力。第一阶段只读取状态，不执行本地命令。</p>
        </div>
        <div className="hero-meta">
          <span>连接状态</span>
          <strong>{status?.connected ? "已连接" : status?.configured ? "离线" : "未配置"}</strong>
          <small>{status?.message || "正在读取本地助手状态"}</small>
        </div>
      </div>

      <div className="top-actions" style={{ marginBottom: 14 }}>
        <button className="primary-button" type="button" onClick={refresh} disabled={loading}>
          <RefreshCw className={loading ? "spin" : ""} size={16} aria-hidden />{loading ? "刷新中" : "刷新状态"}
        </button>
        <Link className="text-button" href="/app/tools"><Settings size={16} aria-hidden />配置本地助手</Link>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="grid-dashboard">
        <div className="local-agent-main" style={{ display: "grid", gap: 14 }}>
          <section className="panel">
            <div className="panel-header">
              <h2><MonitorCog size={16} aria-hidden /> 本地 Agent</h2>
              <span className={`badge ${agentBadge}`}>
                {status?.connected ? <CheckCircle2 size={13} aria-hidden /> : <AlertTriangle size={13} aria-hidden />}
                {status?.connected ? "可用" : status?.configured ? "离线" : "待配置"}
              </span>
            </div>
            <div className="tool-card-body">
              <p className="row-subtitle" style={{ whiteSpace: "normal" }}>{status?.message || "正在检查本地助手。"}</p>
              {!status?.configured ? (
                <div className="empty-state compact">
                  先在工具中心配置 LOCAL_AGENT_BASE_URL 和 LOCAL_AGENT_TOKEN，然后启动 `pnpm local-agent`。
                </div>
              ) : null}
              {status?.health ? (
                <div className="table-list">
                  <div className="row"><span>名称</span><strong>{status.health.name || "MyOS Local Agent"}</strong></div>
                  <div className="row"><span>版本</span><strong>{status.health.version || "未知"}</strong></div>
                </div>
              ) : null}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2>Ollama</h2>
              <span className={`badge ${status?.ollama?.ok ? "success" : "warning"}`}>
                {status?.ollama?.ok ? "可用" : "不可用"}
              </span>
            </div>
            <div className="tool-card-body">
              <p className="row-subtitle" style={{ whiteSpace: "normal" }}>{status?.ollama?.message || "等待本地助手返回 Ollama 状态。"}</p>
              <div className="table-list">
                <div className="row"><span>模型数量</span><strong>{status?.ollama?.models ?? 0}</strong></div>
              </div>
            </div>
          </section>
        </div>

        <aside className="today-side">
          <section className="panel">
            <div className="panel-header"><h2><FolderKanban size={16} aria-hidden /> 允许项目</h2></div>
            <div className="table-list">
              {status?.projects.map((project) => (
                <div className="row" key={project.id}>
                  <span>
                    <span className="row-title">{project.name}</span>
                    <span className="row-subtitle">{project.path}</span>
                  </span>
                  <span className={`badge ${project.vscode ? "success" : "warning"}`}>{project.vscode ? "VS Code" : "只读"}</span>
                </div>
              ))}
              {status && !status.projects.length ? <div className="empty-state compact">本地助手尚未配置允许项目。</div> : null}
              {!status ? <div className="empty-state compact">正在读取项目列表。</div> : null}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header"><h2>下一步</h2></div>
            <div className="table-list">
              <div className="row"><span><span className="row-title">1. 配置 Token</span><span className="row-subtitle">复制示例配置为 agent.config.json，并设置随机 token。</span></span><span className="badge">必要</span></div>
              <div className="row"><span><span className="row-title">2. 启动 Agent</span><span className="row-subtitle">运行 pnpm local-agent。</span></span><span className="badge">本机</span></div>
              <div className="row"><span><span className="row-title">3. 稳定后扩展</span><span className="row-subtitle">再加入打开文件夹、VS Code 和白名单脚本。</span></span><span className="badge">后续</span></div>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
