"use client";

import Link from "next/link";
import { Bot, Braces, CheckCircle2, Clipboard, Cpu, KeyRound, Loader2, Plug, RefreshCw, Search, Settings2, Wrench } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { agentRegistry, type KnownAgentId } from "@/features/agents/registry";

type CapabilityData = {
  skills: Array<{ id: string; name: string; category: string }>;
  skillSourceAvailable: boolean;
  mcpServers: Array<{ id: string; name: string; status: "ready" | "needs_config"; detail: string; config: string }>;
  apiFields: Array<{ key: string; label: string; group: string; configured: boolean; secret: boolean; description: string }>;
  localAgent: { configured: boolean; connected: boolean; message: string; projects: Array<{ id: string; name: string }> };
  pythonAgent: { configured: boolean; connected: boolean; message: string; baseUrl: string; version?: string; myosConfigured?: boolean; agents: Array<{ id: string; label: string; available: boolean; executionMode: "manual" | "adapter"; detail: string }> };
};

type AgentMcpPreview = { supported: boolean; configured: boolean; applied?: boolean; target?: string; targetExists?: boolean; backup?: string | null; detail: string; confirmation?: string | null };

export default function CapabilitiesPage() {
  const [data, setData] = useState<CapabilityData | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [agentId, setAgentId] = useState<KnownAgentId>("codex");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [projectId, setProjectId] = useState("");
  const [configPreview, setConfigPreview] = useState<AgentMcpPreview | null>(null);
  const [configBusy, setConfigBusy] = useState(false);
  const skills = useMemo(() => data?.skills.filter((skill) => `${skill.name} ${skill.category}`.toLowerCase().includes(query.trim().toLowerCase())) || [], [data?.skills, query]);
  const activeAgent = agentRegistry.find((agent) => agent.id === agentId) || agentRegistry[0];
  const profileSupport: Record<KnownAgentId, { skill: string; mcp: string; api: string }> = {
    codex: { skill: "共享 Skill 目录", mcp: "stdio MCP", api: "环境变量 / Provider" },
    "claude-code": { skill: "共享 Skill 目录", mcp: "stdio MCP", api: "环境变量 / Provider" },
    opencode: { skill: "共享 Skill 目录", mcp: "stdio MCP", api: "环境变量 / Provider" },
    copilot: { skill: "共享 Skill 目录", mcp: "通过本地适配", api: "Copilot 登录 / BYOK" },
    hermes: { skill: "共享 Skill 目录", mcp: "stdio MCP", api: "环境变量 / Provider" },
    openclaw: { skill: "通过本地适配", mcp: "stdio MCP", api: "环境变量 / Provider" }
  };

  async function refresh() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/capabilities", { cache: "no-store" });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || "读取能力中心失败。");
      setData(body);
      setProjectId((current) => current || body.localAgent?.projects?.[0]?.id || "");
    } catch (refreshError) { setError(refreshError instanceof Error ? refreshError.message : "读取能力中心失败。"); }
    finally { setLoading(false); }
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setMessage("MCP 配置片段已复制。");
    window.setTimeout(() => setMessage(""), 1800);
  }

  useEffect(() => { void refresh(); }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem("myos-capability-agent");
    if (saved && agentRegistry.some((agent) => agent.id === saved)) setAgentId(saved as KnownAgentId);
  }, []);

  function selectAgent(next: KnownAgentId) {
    setAgentId(next);
    setConfigPreview(null);
    window.localStorage.setItem("myos-capability-agent", next);
  }

  async function previewLocalMcp() {
    if (!projectId) { setError("先在本地助手允许列表中添加一个项目。"); return; }
    setConfigBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/capabilities/agent-mcp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ agentId, projectId }) });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || "无法预览配置。");
      setConfigPreview(body);
    } catch (previewError) { setError(previewError instanceof Error ? previewError.message : "无法预览配置。"); }
    finally { setConfigBusy(false); }
  }

  async function applyLocalMcp() {
    if (!projectId) return;
    setConfigBusy(true); setError("");
    try {
      const response = await fetch("/api/capabilities/agent-mcp", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ agentId, projectId, confirmation: "APPLY_MCP_CONFIGURATION" }) });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || "无法应用配置。");
      setConfigPreview(body);
      setMessage(body.detail || "本地配置已写入。");
    } catch (applyError) { setError(applyError instanceof Error ? applyError.message : "无法应用配置。"); }
    finally { setConfigBusy(false); }
  }

  return <>
    <div className="page-header"><div><p className="eyebrow"><Wrench size={14} aria-hidden /> 能力中心</p><h1>MCP、Skills 与 API</h1><p>集中查看可用技能、MCP 服务与服务端 API 配置状态。密钥不会显示在页面中。</p></div><button className="text-button" type="button" onClick={() => void refresh()} disabled={loading}><RefreshCw size={16} aria-hidden />刷新</button></div>
    {message ? <p className="config-message">{message}</p> : null}{error ? <p className="form-error">{error}</p> : null}
    <section className="agent-profile-switcher" aria-label="管理 Agent 配置">
      <div className="agent-profile-heading"><Bot size={17} aria-hidden /><span><strong>当前管理对象</strong><small>{activeAgent.name} · {activeAgent.description}</small></span></div>
      <div className="agent-profile-options">{agentRegistry.map((agent) => { const Icon = agent.icon; return <button className={agent.id === agentId ? "active" : ""} key={agent.id} type="button" onClick={() => selectAgent(agent.id)}><Icon size={16} aria-hidden />{agent.name}</button>; })}</div>
      <div className="agent-profile-support"><span>Skills：{profileSupport[agentId].skill}</span><span>MCP：{profileSupport[agentId].mcp}</span><span>API：{profileSupport[agentId].api}</span></div>
    </section>
    <section className="agent-config-panel">
      <div><p className="eyebrow"><Settings2 size={14} aria-hidden /> 本机接入</p><h2>把 MyOS MCP 写入项目</h2><p>仅通过本地助手写入已允许的项目。支持 Claude Code 与 OpenCode；写入前预览，现有文件自动备份。</p></div>
      <div className="agent-config-controls">
        <select value={projectId} onChange={(event) => { setProjectId(event.target.value); setConfigPreview(null); }} disabled={!data?.localAgent.connected} aria-label="选择本地项目">
          <option value="">{data?.localAgent.connected ? "选择本地项目" : "本地助手未连接"}</option>
          {data?.localAgent.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
        <button className="text-button" type="button" onClick={() => void previewLocalMcp()} disabled={configBusy || !data?.localAgent.connected || !projectId}><Search size={15} aria-hidden />预览</button>
      </div>
      {configPreview ? <div className="agent-config-result"><span className={`badge ${configPreview.configured ? "success" : "warning"}`}>{configPreview.configured ? "已配置" : configPreview.supported ? "待应用" : "需手动配置"}</span><p>{configPreview.detail}</p>{configPreview.target ? <small>目标文件：{configPreview.target}{configPreview.targetExists ? "（已有文件将先备份）" : "（将新建）"}</small> : null}{configPreview.supported && !configPreview.configured ? <button className="primary-button" type="button" onClick={() => void applyLocalMcp()} disabled={configBusy}>{configBusy ? <Loader2 className="spin" size={15} aria-hidden /> : <Plug size={15} aria-hidden />}确认应用并备份</button> : null}{configPreview.backup ? <small>已创建备份：{configPreview.backup}</small> : null}</div> : <small className="row-subtitle">{data?.localAgent.message || "正在读取本地助手状态。"}</small>}
    </section>
    <section className="panel runtime-status-panel">
      <div className="panel-header"><h2><Cpu size={17} aria-hidden /> Python Agent Runtime</h2><span className={`badge ${data?.pythonAgent.connected ? "success" : "warning"}`}>{data?.pythonAgent.connected ? "在线" : "未连接"}</span></div>
      <p className="row-subtitle">负责读取项目上下文、创建 Agent 工作项、接收心跳和汇报；当前不会执行任意电脑命令。</p>
      <div className="runtime-status-grid">
        <span>地址<strong>{data?.pythonAgent.baseUrl || "-"}</strong></span>
        <span>版本<strong>{data?.pythonAgent.version || "-"}</strong></span>
        <span>MyOS API<strong>{data?.pythonAgent.myosConfigured ? "已配置" : "待配置"}</strong></span>
        <span>Agent 目标<strong>{data?.pythonAgent.agents.length || 0}</strong></span>
      </div>
      <p className="row-subtitle">{data?.pythonAgent.message || "正在读取运行时状态。"}</p>
      <Link className="text-button" href="/app/settings">配置运行时</Link>
    </section>
    <div className="capability-summary">
      <div><Wrench size={18} aria-hidden /><span>已发现 Skills<strong>{data?.skills.length ?? "-"}</strong></span></div>
      <div><Plug size={18} aria-hidden /><span>MCP 服务<strong>{data?.mcpServers.length ?? "-"}</strong></span></div>
      <div><KeyRound size={18} aria-hidden /><span>已配置 API<strong>{data?.apiFields.filter((field) => field.configured).length ?? "-"}</strong></span></div>
    </div>
    <div className="capability-layout">
      <div className="capability-main">
        <section className="panel"><div className="panel-header"><h2>{activeAgent.name} Skills</h2><span className="row-subtitle">{profileSupport[agentId].skill}</span></div><div className="capability-search"><Search size={16} aria-hidden /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索 Skill" /></div><div className="skill-grid">{skills.map((skill) => <div className="skill-tile" key={skill.id}><Braces size={16} aria-hidden /><strong>{skill.name}</strong><span>{skill.category}</span></div>)}{!loading && !skills.length ? <div className="empty-state">{data?.skillSourceAvailable ? "没有匹配的 Skill。" : "未发现本地 Skill 目录，配置 MYOS_SKILLS_ROOT 后可扫描自定义目录。"}</div> : null}{loading ? <div className="empty-state"><Loader2 className="spin" size={17} aria-hidden />正在读取本地能力…</div> : null}</div></section>
        <section className="panel"><div className="panel-header"><h2>{activeAgent.name} MCP</h2><span className="row-subtitle">{profileSupport[agentId].mcp} 配置模板</span></div><div className="mcp-list">{data?.mcpServers.map((server) => <div className="mcp-card" key={server.id}><div><Plug size={17} aria-hidden /><span><strong>{server.name}</strong><small>{server.detail}</small></span><span className={`badge ${server.status === "ready" ? "success" : "warning"}`}>{server.status === "ready" ? "就绪" : "待配置"}</span></div><pre>{server.config}</pre><button className="text-button" type="button" onClick={() => void copy(server.config)}><Clipboard size={15} aria-hidden />复制 {activeAgent.name} 配置</button></div>)}</div></section>
      </div>
      <aside className="capability-side"><section className="panel"><div className="panel-header"><h2>API 与连接</h2><Link className="panel-link" href="/app/settings">管理密钥</Link></div><div className="table-list">{data?.apiFields.map((field) => <div className="row" key={field.key}><span><span className="row-title">{field.label}</span><span className="row-subtitle">{field.description}</span></span><span className={`badge ${field.configured ? "success" : "warning"}`}>{field.configured ? <CheckCircle2 size={13} aria-hidden /> : null}{field.configured ? "已配置" : "未配置"}</span></div>)}</div></section></aside>
    </div>
  </>;
}
