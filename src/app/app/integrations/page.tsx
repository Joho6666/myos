"use client";

import Link from "next/link";
import { Activity, AlertTriangle, CalendarDays, CheckCircle2, ClipboardList, Database, ExternalLink, GitBranch, Loader2, Mail, MessageSquare, Paperclip, RefreshCw, ScrollText, ServerCog, Sparkles, Workflow } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { postMyOSAction, publishMyOSData } from "@/lib/data/client-actions";
import { useMyOSData } from "@/lib/data/store";

type IntegrationStatus = {
  id: string;
  name: string;
  category: string;
  state: "connected" | "unconfigured" | "error";
  message: string;
  detail?: string;
};

type GitHubSummary = {
  profile: {
    login: string;
    htmlUrl: string;
    publicRepos: number;
    followers: number;
    following: number;
  };
  repositories: Array<{
    name: string;
    fullName: string;
    htmlUrl: string;
    description: string;
    updatedAt: string;
    private: boolean;
    language: string;
    openIssuesCount: number;
    stars: number;
  }>;
  issues: Array<{
    title: string;
    htmlUrl: string;
    repository: string;
    updatedAt: string;
    state: string;
  }>;
  starred: Array<{
    name: string;
    fullName: string;
    htmlUrl: string;
    description: string;
    language: string;
    stars: number;
  }>;
};

type NotionSummary = {
  items: Array<{
    id: string;
    title: string;
    type: "page" | "database";
    url: string;
    editedAt: string;
    archived: boolean;
  }>;
};

type GmailSummary = {
  messages: Array<{
    id: string;
    threadId: string;
    subject: string;
    from: string;
    date: string;
    snippet: string;
    unread: boolean;
    important: boolean;
    url: string;
    attachmentCount: number;
    attachmentNames: string[];
  }>;
};

type SyncSnapshot = {
  integrations: Array<{ provider: string; status: "success" | "failed" | "unconfigured"; syncStatus?: string; lastSyncedAt?: string }>;
  logs: Array<{ id: string; provider: string; status: "success" | "failed" | "unconfigured"; message: string; createdAt: string }>;
};

const iconMap = {
  github: GitBranch,
  gmail: Mail,
  notion: ScrollText,
  supabase: Database,
  n8n: Activity,
  ai: Sparkles
};

const platformCatalog = [
  { id: "github", name: "GitHub", category: "代码与协作", detail: "把仓库、Issue 和收藏项目转入项目与任务。", mode: "direct" as const, icon: GitBranch },
  { id: "gmail", name: "Gmail", category: "收件箱", detail: "把邮件需求和附件带入万能收件箱。", mode: "direct" as const, icon: Mail },
  { id: "notion", name: "Notion", category: "知识", detail: "把页面和数据库沉淀到 MyOS 知识库。", mode: "direct" as const, icon: ScrollText },
  { id: "supabase", name: "Supabase", category: "数据", detail: "MyOS 的私有数据、认证和文件底座。", mode: "direct" as const, icon: Database },
  { id: "n8n", name: "n8n", category: "自动化", detail: "让重复流程通过安全 Webhook 执行。", mode: "direct" as const, icon: Workflow },
  { id: "google-calendar", name: "Google Calendar", category: "日程", detail: "通过 OAuth 或 MCP 汇总日程到今日视图。", mode: "mcp" as const, icon: CalendarDays },
  { id: "linear", name: "Linear", category: "项目协作", detail: "通过 API 或 MCP 汇总 Issue 与周期计划。", mode: "mcp" as const, icon: ClipboardList },
  { id: "figma", name: "Figma", category: "设计", detail: "通过 MCP 为 Agent 提供设计上下文和实现线索。", mode: "mcp" as const, icon: Sparkles },
  { id: "vercel", name: "Vercel", category: "部署", detail: "通过 API 或 MCP 查看部署、构建和异常。", mode: "mcp" as const, icon: ServerCog },
  { id: "slack", name: "Slack", category: "沟通", detail: "通过 API 或 MCP 收集需要处理的消息。", mode: "mcp" as const, icon: MessageSquare }
];

export default function IntegrationsPage() {
  const { data } = useMyOSData();
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [github, setGithub] = useState<GitHubSummary | null>(null);
  const [notion, setNotion] = useState<NotionSummary | null>(null);
  const [gmail, setGmail] = useState<GmailSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [notionLoading, setNotionLoading] = useState(false);
  const [gmailLoading, setGmailLoading] = useState(false);
  const [allLoading, setAllLoading] = useState(false);
  const [importing, setImporting] = useState("");
  const [error, setError] = useState("");
  const [githubError, setGithubError] = useState("");
  const [githubMessage, setGithubMessage] = useState("");
  const [notionError, setNotionError] = useState("");
  const [notionMessage, setNotionMessage] = useState("");
  const [gmailError, setGmailError] = useState("");
  const [gmailMessage, setGmailMessage] = useState("");
  const [syncSnapshot, setSyncSnapshot] = useState<SyncSnapshot>({ integrations: [], logs: [] });
  const [syncLoading, setSyncLoading] = useState(false);
  const connectedCount = integrations.filter((item) => item.state === "connected").length;
  const unconfiguredCount = integrations.filter((item) => item.state === "unconfigured").length;
  const errorCount = integrations.filter((item) => item.state === "error").length;
  const statusReady = integrations.length > 0;
  const statusFailed = Boolean(error && !statusReady);
  const statusLoading = loading || (!statusReady && !statusFailed);
  const integrationById = useMemo(() => new Map(integrations.map((integration) => [integration.id, integration])), [integrations]);
  const readiness = integrations.length ? Math.round((connectedCount / integrations.length) * 100) : 0;
  const pendingTasks = data.tasks.filter((task) => !task.done).length;
  const pendingInbox = data.inbox.filter((item) => item.status === "pending").length;
  const activeProjects = data.projects.filter((project) => project.status === "active").length;
  const projectNames = useMemo(() => new Set(data.projects.map((project) => project.name.toLowerCase())), [data.projects]);
  const taskKeys = useMemo(() => new Set(data.tasks.map((task) => `${task.project || ""}::${task.title}`.toLowerCase())), [data.tasks]);
  const noteTitles = useMemo(() => new Set(data.notes.map((note) => note.title.toLowerCase())), [data.notes]);
  const inboxTitles = useMemo(() => new Set(data.inbox.map((item) => item.title.toLowerCase())), [data.inbox]);
  const overview = useMemo(() => [
    { label: "活跃项目", value: activeProjects },
    { label: "待完成任务", value: pendingTasks },
    { label: "待分类收件箱", value: pendingInbox },
    { label: "知识笔记", value: data.notes.length },
    { label: "文件记录", value: data.files.length },
    { label: "提示词", value: data.prompts.length }
  ], [activeProjects, data.files.length, data.notes.length, data.prompts.length, pendingInbox, pendingTasks]);
  const externalSignals = useMemo(() => {
    const repoSignals = github?.repositories
      .filter((repo) => !projectNames.has(repo.fullName.toLowerCase()))
      .slice(0, 4)
      .map((repo) => ({
        id: `repo:${repo.fullName}`,
        source: "GitHub",
        title: repo.fullName,
        detail: repo.description || `${repo.language || "Unknown"} / ${formatDate(repo.updatedAt)}`,
        tone: "work" as const,
        action: "导入项目"
      })) || [];
    const issueSignals = github?.issues
      .filter((issue) => !taskKeys.has(`${issue.repository}::${issue.title}`.toLowerCase()))
      .slice(0, 4)
      .map((issue) => ({
        id: `issue:${issue.htmlUrl}`,
        source: "GitHub Issue",
        title: issue.title,
        detail: issue.repository,
        tone: "urgent" as const,
        action: "转任务"
      })) || [];
    const notionSignals = notion?.items
      .filter((item) => !noteTitles.has(item.title.toLowerCase()))
      .slice(0, 4)
      .map((item) => ({
        id: `notion:${item.id}`,
        source: "Notion",
        title: item.title,
        detail: item.type === "database" ? "数据库可导入知识库" : "页面可导入知识库",
        tone: "knowledge" as const,
        action: "导入知识"
      })) || [];
    const gmailSignals = gmail?.messages
      .filter((message) => message.unread || message.important)
      .filter((message) => !inboxTitles.has(`邮件：${message.subject}`.toLowerCase()))
      .slice(0, 4)
      .map((message) => ({
        id: `gmail:${message.id}`,
        source: "Gmail",
        title: message.subject,
        detail: `${message.from} / ${message.snippet || "无摘要"}`,
        tone: message.important ? "urgent" as const : "mail" as const,
        action: "进收件箱"
      })) || [];
    return [...issueSignals, ...gmailSignals, ...repoSignals, ...notionSignals].slice(0, 10);
  }, [github, gmail, inboxTitles, noteTitles, notion, projectNames, taskKeys]);
  const focusBrief = useMemo(() => {
    if (loading) return "正在读取连接状态，请稍候。";
    if (error && !integrations.length) return "连接状态读取失败，请检查服务端配置后重试。";
    if (!integrations.length) return "先刷新连接状态，确认 MyOS 能看到哪些外部系统。";
    if (errorCount > 0) return "有连接异常，先处理异常连接，避免看板数据不完整。";
    if (unconfiguredCount > 0) return "还有外部系统未接入，优先配置你最常用的 GitHub、Gmail 或 Notion。";
    if (externalSignals.length > 0) return "已经有外部信号可处理，建议把重要内容导入 MyOS。";
    return "连接状态干净，可以继续用 MyOS 作为日常总控台。";
  }, [error, errorCount, externalSignals.length, integrations.length, loading, unconfiguredCount]);
  const setupChecklist = useMemo(() => {
    const configured = new Set(integrations.filter((item) => item.state === "connected").map((item) => item.id));
    return [
      { id: "supabase", title: "数据库", detail: "保存项目、任务、文件记录和活动日志", done: configured.has("supabase") },
      { id: "github", title: "GitHub", detail: "读取仓库、Issue、Star 并转入项目中心", done: configured.has("github") },
      { id: "gmail", title: "Gmail", detail: "读取近期邮件，把需求和资料收进收件箱", done: configured.has("gmail") },
      { id: "notion", title: "Notion", detail: "读取页面和数据库，沉淀到知识库", done: configured.has("notion") },
      { id: "ai", title: "AI", detail: "用 AI 工作台总结外部信息和生成下一步", done: configured.has("ai") },
      { id: "n8n", title: "n8n", detail: "让日报、文档分析和项目周报自动运行", done: configured.has("n8n") }
    ];
  }, [integrations]);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/integrations/status", { cache: "no-store" });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || "读取连接状态失败。");
      setIntegrations(body.integrations || []);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "读取连接状态失败。");
    } finally {
      setLoading(false);
    }
  }

  async function loadGitHubSummary() {
    setGithubLoading(true);
    setGithubError("");
    setGithubMessage("");
    try {
      const response = await fetch("/api/integrations/github/summary", { cache: "no-store" });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || "读取 GitHub 总览失败。");
      setGithub(body);
    } catch (summaryError) {
      setGithub(null);
      setGithubError(summaryError instanceof Error ? summaryError.message : "读取 GitHub 总览失败。");
    } finally {
      setGithubLoading(false);
    }
  }

  async function loadNotionSummary() {
    setNotionLoading(true);
    setNotionError("");
    setNotionMessage("");
    try {
      const response = await fetch("/api/integrations/notion/summary", { method: "POST", cache: "no-store" });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || "读取 Notion 总览失败。");
      setNotion(body);
    } catch (summaryError) {
      setNotion(null);
      setNotionError(summaryError instanceof Error ? summaryError.message : "读取 Notion 总览失败。");
    } finally {
      setNotionLoading(false);
    }
  }

  async function loadGmailSummary() {
    setGmailLoading(true);
    setGmailError("");
    setGmailMessage("");
    try {
      const response = await fetch("/api/integrations/gmail/summary", { cache: "no-store" });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || "读取 Gmail 总览失败。");
      setGmail(body);
    } catch (summaryError) {
      setGmail(null);
      setGmailError(summaryError instanceof Error ? summaryError.message : "读取 Gmail 总览失败。");
    } finally {
      setGmailLoading(false);
    }
  }

  async function loadSyncStatus() {
    setSyncLoading(true);
    try {
      const response = await fetch("/api/integrations/sync", { cache: "no-store" });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || "读取同步状态失败。");
      setSyncSnapshot(body || { integrations: [], logs: [] });
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "读取同步状态失败。");
    } finally {
      setSyncLoading(false);
    }
  }

  async function loadEverything() {
    setAllLoading(true);
    setError("");
    setGithubError("");
    setNotionError("");
    setGmailError("");
    setGithubMessage("");
    setNotionMessage("");
    setGmailMessage("");
    try {
      await Promise.allSettled([refresh(), loadGitHubSummary(), loadNotionSummary(), loadGmailSummary()]);
      await loadSyncStatus();
    } finally {
      setAllLoading(false);
    }
  }

  async function importRepository(repo: GitHubSummary["repositories"][number]) {
    setImporting(`repo:${repo.fullName}`);
    setGithubError("");
    setGithubMessage("");
    try {
      const next = await postMyOSAction({
        type: "addProject",
        payload: {
          name: repo.fullName,
          category: "GitHub开源",
          nextAction: repo.openIssuesCount > 0 ? `处理 ${repo.openIssuesCount} 个 open issue` : "梳理仓库用途和下一步计划"
        }
      });
      publishMyOSData(next);
      setGithubMessage(`${repo.fullName} 已导入项目中心。`);
    } catch (importError) {
      setGithubError(importError instanceof Error ? importError.message : "导入仓库失败。");
    } finally {
      setImporting("");
    }
  }

  async function importIssue(issue: GitHubSummary["issues"][number]) {
    setImporting(`issue:${issue.htmlUrl || issue.title}`);
    setGithubError("");
    setGithubMessage("");
    try {
      const next = await postMyOSAction({
        type: "addTask",
        payload: {
          title: issue.title,
          priority: "medium",
          project: issue.repository,
          due: "今天",
          plannedDate: "today",
          todayFocus: false
        }
      });
      publishMyOSData(next);
      setGithubMessage(`${issue.title} 已转成任务。`);
    } catch (importError) {
      setGithubError(importError instanceof Error ? importError.message : "转成任务失败。");
    } finally {
      setImporting("");
    }
  }

  async function importNotionItem(item: NotionSummary["items"][number]) {
    setImporting(`notion:${item.id}`);
    setNotionError("");
    setNotionMessage("");
    try {
      const next = await postMyOSAction({
        type: "addNote",
        payload: {
          title: item.title,
          type: item.type === "database" ? "Notion数据库" : "Notion页面",
          summary: `${item.type === "database" ? "数据库" : "页面"}来自 Notion。链接：${item.url || "未提供"}`
        }
      });
      publishMyOSData(next);
      setNotionMessage(`${item.title} 已导入知识库。`);
    } catch (importError) {
      setNotionError(importError instanceof Error ? importError.message : "导入 Notion 条目失败。");
    } finally {
      setImporting("");
    }
  }

  async function importGmailMessage(message: GmailSummary["messages"][number]) {
    setImporting(`gmail:${message.id}`);
    setGmailError("");
    setGmailMessage("");
    try {
      const next = await postMyOSAction({
        type: "addInbox",
        payload: {
          title: `邮件：${message.subject}`,
          type: "text",
          category: "Gmail"
        }
      });
      publishMyOSData(next);
      setGmailMessage(`${message.subject} 已进入万能收件箱。`);
    } catch (importError) {
      setGmailError(importError instanceof Error ? importError.message : "导入邮件失败。");
    } finally {
      setImporting("");
    }
  }

  async function importGmailAttachments(message: GmailSummary["messages"][number]) {
    setImporting(`gmail-attachments:${message.id}`);
    setGmailError("");
    setGmailMessage("");
    try {
      const response = await fetch("/api/integrations/gmail/attachments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messageId: message.id, project: "Gmail" })
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || "导入 Gmail 附件失败。");
      if (body?.data) {
        publishMyOSData(body.data);
      }
      setGmailMessage(body?.message || `${message.subject} 的附件已导入文件中心。`);
    } catch (importError) {
      setGmailError(importError instanceof Error ? importError.message : "导入 Gmail 附件失败。");
    } finally {
      setImporting("");
    }
  }

  function formatDate(value: string) {
    if (!value) return "未知";
    return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  }

  useEffect(() => {
    void refresh();
    void loadSyncStatus();
  }, []);

  return (
    <>
      <div className="workspace-hero integration-hero">
        <div className="hero-copy">
          <h1>连接看板</h1>
          <p>把 GitHub、数据库、Gmail、Notion、AI 和自动化放进一个全局视角，形成你的个人态势总控台。</p>
          <div className="hero-brief">
            {errorCount > 0 ? <AlertTriangle size={16} aria-hidden /> : <CheckCircle2 size={16} aria-hidden />}
            <span>{focusBrief}</span>
          </div>
        </div>
        <div className="hero-meta">
          <span>连接健康度</span>
          <strong>{statusReady ? `${readiness}%` : "…"}</strong>
          <small>{statusReady ? `${connectedCount}/${integrations.length} 已连接` : "读取中"}</small>
        </div>
      </div>

      <div className="metric-strip">
        <div className="metric-item"><span>连接健康</span><strong>{statusReady ? `${readiness}%` : "—"}</strong></div>
        <div className="metric-item"><span>外部信号</span><strong>{statusReady ? externalSignals.length : "—"}</strong></div>
        <div className="metric-item"><span>待配置</span><strong>{statusReady ? unconfiguredCount : "—"}</strong></div>
        <div className="metric-item"><span>异常</span><strong>{statusReady ? errorCount : "—"}</strong></div>
      </div>

      <div className="top-actions integration-actions" style={{ marginBottom: 14 }}>
        <button className="primary-button" type="button" onClick={loadEverything} disabled={allLoading}>
          {allLoading ? <Loader2 className="spin" size={16} aria-hidden /> : <RefreshCw size={16} aria-hidden />}
          {allLoading ? "同步中" : "一键刷新全部"}
        </button>
        <button className="text-button" type="button" onClick={refresh} disabled={loading}>
          <RefreshCw size={16} aria-hidden />{loading ? "刷新中" : "刷新连接状态"}
        </button>
        <button className="text-button" type="button" onClick={loadGitHubSummary} disabled={githubLoading}>
          <GitBranch size={16} aria-hidden />{githubLoading ? "读取中" : "读取 GitHub"}
        </button>
        <button className="text-button" type="button" onClick={loadNotionSummary} disabled={notionLoading}>
          <ScrollText size={16} aria-hidden />{notionLoading ? "读取中" : "读取 Notion"}
        </button>
        <button className="text-button" type="button" onClick={loadGmailSummary} disabled={gmailLoading}>
          <Mail size={16} aria-hidden />{gmailLoading ? "读取中" : "读取 Gmail"}
        </button>
        <Link className="text-button" href="/app/settings">集成设置</Link>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      {githubError ? <p className="form-error">{githubError}</p> : null}
      {githubMessage ? <p className="config-message">{githubMessage}</p> : null}
      {notionError ? <p className="form-error">{notionError}</p> : null}
      {notionMessage ? <p className="config-message">{notionMessage}</p> : null}
      {gmailError ? <p className="form-error">{gmailError}</p> : null}
      {gmailMessage ? <p className="config-message">{gmailMessage}</p> : null}

      <section className="panel platform-catalog" aria-labelledby="platform-catalog-heading">
        <div className="panel-header">
          <div><h2 id="platform-catalog-heading">平台连接目录</h2><p className="panel-description">先接你真正每天使用的系统。只有状态为“已连接”的平台才会向看板同步真实数据。</p></div>
          <Link className="text-button" href="/app/capabilities"><ServerCog size={16} aria-hidden />管理 MCP 与 Agent 能力</Link>
        </div>
        <div className="platform-catalog-grid">
          {platformCatalog.map((platform) => {
            const integration = integrationById.get(platform.id);
            const connected = integration?.state === "connected";
            const failed = integration?.state === "error";
            const status = statusLoading ? "读取中" : statusFailed ? "读取失败" : connected ? "已连接" : failed ? "连接异常" : platform.mode === "mcp" ? "通过 MCP 添加" : "待配置";
            const href = platform.mode === "mcp" ? "/app/capabilities" : "/app/settings";
            const Icon = platform.icon;
            return <Link className="platform-catalog-item" href={href} key={platform.id}>
              <span className="platform-catalog-icon"><Icon size={17} aria-hidden /></span>
              <span><strong>{platform.name}</strong><small>{platform.category} · {platform.detail}</small></span>
              <span className={`badge ${connected ? "success" : failed ? "failed" : "warning"}`}>{status}</span>
            </Link>;
          })}
        </div>
      </section>

      <div className="integration-layout">
        <div className="integration-main" style={{ display: "grid", gap: 14 }}>
          <section className="panel command-center-panel">
            <div className="panel-header">
              <h2>全局态势</h2>
              <span className={`badge ${statusLoading ? "warning" : statusFailed || errorCount ? "failed" : unconfiguredCount ? "warning" : "success"}`}>
                {statusLoading ? "读取中" : statusFailed ? "读取失败" : errorCount ? "需要处理" : unconfiguredCount ? "继续接入" : "状态良好"}
              </span>
            </div>
            <div className="signal-grid">
              <article className="signal-card">
                <span className="signal-label">MyOS 内部</span>
                <strong>{pendingTasks + pendingInbox}</strong>
                <p>{pendingTasks} 个待办，{pendingInbox} 条待分类内容。</p>
              </article>
              <article className="signal-card">
                <span className="signal-label">外部入口</span>
                <strong>{externalSignals.length}</strong>
                <p>来自 GitHub、Gmail、Notion 的可处理内容。</p>
              </article>
              <article className="signal-card">
                <span className="signal-label">连接完成</span>
                <strong>{statusReady ? connectedCount : "—"}</strong>
                <p>{statusReady ? `${unconfiguredCount} 个待配置，${errorCount} 个异常。` : "正在读取连接状态。"}</p>
              </article>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2>待处理信号</h2>
              <button className="text-button" type="button" onClick={loadEverything} disabled={allLoading}>
                <ClipboardList size={15} aria-hidden />刷新信号
              </button>
            </div>
            <div className="table-list">
              {externalSignals.map((signal) => (
                <div className={`row signal-row ${signal.tone}`} key={signal.id}>
                  <span>
                    <span className="row-title">{signal.title}</span>
                    <span className="row-subtitle">{signal.source} / {signal.detail}</span>
                  </span>
                  <span className="badge">{signal.action}</span>
                </div>
              ))}
              {!externalSignals.length ? (
                <div className="empty-state compact">
                  还没有读取到外部待处理内容。先点击“一键刷新全部”，或到设置里配置 GitHub、Gmail、Notion。
                </div>
              ) : null}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header"><h2>连接状态</h2></div>
            <div className="integration-grid">
              {integrations.map((integration) => {
                const Icon = iconMap[integration.id as keyof typeof iconMap] || Activity;
                return (
                  <article className="integration-card" key={integration.id}>
                    <div className="integration-card-top">
                      <span className="integration-icon"><Icon size={18} aria-hidden /></span>
                      <span className={`badge ${integration.state === "connected" ? "success" : integration.state === "error" ? "failed" : "warning"}`}>{integration.state === "connected" ? "已连接" : integration.state === "error" ? "异常" : "待配置"}</span>
                    </div>
                    <h3>{integration.name}</h3>
                    <p>{integration.message}</p>
                    {integration.detail ? <small>{integration.detail}</small> : null}
                  </article>
                );
              })}
              {!integrations.length ? <div className="empty-state">正在读取连接状态。</div> : null}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header"><h2>同步状态</h2><button className="text-button" type="button" onClick={loadSyncStatus} disabled={syncLoading}><RefreshCw size={15} aria-hidden />{syncLoading ? "读取中" : "刷新"}</button></div>
            <div className="table-list">
              {syncSnapshot.integrations.map((item) => <div className="row" key={item.provider}><span><span className="row-title">{item.provider}</span><span className="row-subtitle">{item.syncStatus || "尚未有同步记录"}{item.lastSyncedAt ? ` / 最近成功 ${formatDate(item.lastSyncedAt)}` : ""}</span></span><span className={`badge ${item.status === "success" ? "success" : item.status === "failed" ? "failed" : "warning"}`}>{item.status === "success" ? "正常" : item.status === "failed" ? "失败" : "未配置"}</span></div>)}
              {syncSnapshot.logs.slice(0, 5).map((log) => <div className="row" key={log.id}><span><span className="row-title">最近检查</span><span className="row-subtitle">{log.message}</span></span><span className="row-subtitle">{formatDate(log.createdAt)}</span></div>)}
              {!syncSnapshot.integrations.length && !syncSnapshot.logs.length ? <div className="empty-state compact">刷新连接状态后，这里会记录最近检查和失败原因。</div> : null}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2>GitHub 总览</h2>
              <button className="text-button" type="button" onClick={loadGitHubSummary} disabled={githubLoading}>
                <RefreshCw size={15} aria-hidden />{githubLoading ? "读取中" : "刷新"}
              </button>
            </div>
            {!github ? (
              <div className="empty-state compact">
                {githubError ? githubError : "配置 GITHUB_TOKEN 后，可以读取你的仓库、Issue 和收藏项目。"}
              </div>
            ) : (
              <>
                <div className="metric-strip" style={{ margin: 14 }}>
                  <div className="metric-item"><span>账号</span><strong>{github.profile.login}</strong></div>
                  <div className="metric-item"><span>公开仓库</span><strong>{github.profile.publicRepos}</strong></div>
                  <div className="metric-item"><span>关注者</span><strong>{github.profile.followers}</strong></div>
                  <div className="metric-item"><span>待处理 Issue</span><strong>{github.issues.length}</strong></div>
                </div>
                <div className="config-list">
                  <div className="config-row">
                    <div>
                      <div className="row-title">最近更新仓库</div>
                      <div className="row-subtitle">用于判断哪些开发项目最近在推进。</div>
                    </div>
                    <div className="table-list">
                      {github.repositories.map((repo) => {
                        const exists = projectNames.has(repo.fullName.toLowerCase());
                        return (
                          <div className="row" key={repo.fullName}>
                            <span>
                              <a className="row-title" href={repo.htmlUrl} target="_blank" rel="noreferrer">{repo.fullName}</a>
                              <span className="row-subtitle">{repo.description || `${repo.language} / ${formatDate(repo.updatedAt)}`}</span>
                            </span>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                              <span className="badge">{repo.private ? "私有" : `${repo.stars} star`}</span>
                              <button className="text-button" type="button" disabled={exists || importing === `repo:${repo.fullName}`} onClick={() => importRepository(repo)}>
                                {exists ? "已存在" : importing === `repo:${repo.fullName}` ? "导入中" : "导入项目"}
                              </button>
                            </span>
                          </div>
                        );
                      })}
                      {!github.repositories.length ? <div className="empty-state compact">暂无仓库。</div> : null}
                    </div>
                  </div>
                  <div className="config-row">
                    <div>
                      <div className="row-title">分配给你的 Issue</div>
                      <div className="row-subtitle">后续可以一键转成 MyOS 任务。</div>
                    </div>
                    <div className="table-list">
                      {github.issues.map((issue) => {
                        const key = `${issue.repository}::${issue.title}`.toLowerCase();
                        const exists = taskKeys.has(key);
                        return (
                          <div className="row" key={issue.htmlUrl || issue.title}>
                            <span>
                              <a className="row-title" href={issue.htmlUrl} target="_blank" rel="noreferrer">{issue.title}</a>
                              <span className="row-subtitle">{issue.repository} / {formatDate(issue.updatedAt)}</span>
                            </span>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                              <span className="badge warning">{issue.state}</span>
                              <button className="text-button" type="button" disabled={exists || importing === `issue:${issue.htmlUrl || issue.title}`} onClick={() => importIssue(issue)}>
                                {exists ? "已存在" : importing === `issue:${issue.htmlUrl || issue.title}` ? "转换中" : "转任务"}
                              </button>
                            </span>
                          </div>
                        );
                      })}
                      {!github.issues.length ? <div className="empty-state compact">当前没有分配给你的 open issue。</div> : null}
                    </div>
                  </div>
                  <div className="config-row">
                    <div>
                      <div className="row-title">最近收藏</div>
                      <div className="row-subtitle">适合转进收藏夹或项目灵感。</div>
                    </div>
                    <div className="table-list">
                      {github.starred.map((repo) => (
                        <a className="row" href={repo.htmlUrl} target="_blank" rel="noreferrer" key={repo.fullName}>
                          <span>
                            <span className="row-title">{repo.fullName}</span>
                            <span className="row-subtitle">{repo.description || repo.language}</span>
                          </span>
                          <ExternalLink size={15} aria-hidden />
                        </a>
                      ))}
                      {!github.starred.length ? <div className="empty-state compact">暂无收藏项目。</div> : null}
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2>Notion 知识入口</h2>
              <button className="text-button" type="button" onClick={loadNotionSummary} disabled={notionLoading}>
                <RefreshCw size={15} aria-hidden />{notionLoading ? "读取中" : "刷新"}
              </button>
            </div>
            {!notion ? (
              <div className="empty-state compact">
                {notionError ? notionError : "配置 NOTION_TOKEN 后，可以读取最近页面和数据库，并导入到 MyOS 知识库。"}
              </div>
            ) : (
              <div className="table-list">
                {notion.items.map((item) => {
                  const exists = noteTitles.has(item.title.toLowerCase());
                  return (
                    <div className="row" key={item.id || item.title}>
                      <span>
                        <a className="row-title" href={item.url} target="_blank" rel="noreferrer">{item.title}</a>
                        <span className="row-subtitle">{item.type === "database" ? "数据库" : "页面"} / {formatDate(item.editedAt)}</span>
                      </span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <span className={`badge ${item.archived ? "warning" : "success"}`}>{item.archived ? "归档" : "可用"}</span>
                        <button className="text-button" type="button" disabled={exists || importing === `notion:${item.id}`} onClick={() => importNotionItem(item)}>
                          {exists ? "已存在" : importing === `notion:${item.id}` ? "导入中" : "导入知识库"}
                        </button>
                      </span>
                    </div>
                  );
                })}
                {!notion.items.length ? <div className="empty-state compact">没有读取到 Notion 页面或数据库。</div> : null}
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2>Gmail 收件入口</h2>
              <button className="text-button" type="button" onClick={loadGmailSummary} disabled={gmailLoading}>
                <RefreshCw size={15} aria-hidden />{gmailLoading ? "读取中" : "刷新"}
              </button>
            </div>
            {!gmail ? (
              <div className="empty-state compact">
                {gmailError ? gmailError : "配置 Google OAuth 后，可以读取最近收件箱邮件，并导入到 MyOS 万能收件箱。"}
              </div>
            ) : (
              <div className="table-list">
                {gmail.messages.map((message) => {
                  const title = `邮件：${message.subject}`;
                  const exists = inboxTitles.has(title.toLowerCase());
                  return (
                    <div className="row" key={message.id || message.subject}>
                      <span>
                        <a className="row-title" href={message.url} target="_blank" rel="noreferrer">{message.subject}</a>
                        <span className="row-subtitle">
                          {message.from} / {message.snippet || "无摘要"}
                          {message.attachmentCount ? ` / 附件：${message.attachmentNames.join("、") || `${message.attachmentCount} 个`}` : ""}
                        </span>
                      </span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <span className={`badge ${message.unread ? "warning" : "success"}`}>{message.unread ? "未读" : "已读"}</span>
                        {message.attachmentCount ? <span className="badge"><Paperclip size={13} aria-hidden />{message.attachmentCount}</span> : null}
                        <button className="text-button" type="button" disabled={exists || importing === `gmail:${message.id}`} onClick={() => importGmailMessage(message)}>
                          {exists ? "已存在" : importing === `gmail:${message.id}` ? "导入中" : "进收件箱"}
                        </button>
                        <button className="text-button" type="button" disabled={!message.attachmentCount || importing === `gmail-attachments:${message.id}`} onClick={() => importGmailAttachments(message)}>
                          {importing === `gmail-attachments:${message.id}` ? "导入中" : "导入附件"}
                        </button>
                      </span>
                    </div>
                  );
                })}
                {!gmail.messages.length ? <div className="empty-state compact">最近 30 天收件箱没有读取到邮件。</div> : null}
              </div>
            )}
          </section>
        </div>

        <aside className="today-side">
          <section className="panel">
            <div className="panel-header"><h2>MyOS 全局数据</h2></div>
            <div className="table-list">
              {overview.map((item) => <div className="row" key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}
            </div>
          </section>
          <section className="panel">
            <div className="panel-header"><h2>接入进度</h2></div>
            <div className="setup-list">
              {setupChecklist.map((item) => (
                <div className="setup-item" key={item.id}>
                  <span className={`setup-dot ${item.done ? "done" : ""}`}>
                    {item.done ? <CheckCircle2 size={15} aria-hidden /> : <span />}
                  </span>
                  <span>
                    <span className="row-title">{item.title}</span>
                    <span className="row-subtitle">{item.detail}</span>
                  </span>
                </div>
              ))}
            </div>
          </section>
          <section className="panel">
            <div className="panel-header"><h2>下一步接入建议</h2></div>
            <div className="table-list">
              <div className="row"><span><span className="row-title">第一步</span><span className="row-subtitle">先接 GitHub，因为它能马上变成项目和任务。</span></span><span className="badge">优先</span></div>
              <div className="row"><span><span className="row-title">第二步</span><span className="row-subtitle">再接 Gmail，把客户需求、课程通知和附件进入收件箱。</span></span><span className="badge">业务</span></div>
              <div className="row"><span><span className="row-title">第三步</span><span className="row-subtitle">最后接 Notion，逐步迁移长期知识资产。</span></span><span className="badge">知识</span></div>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
