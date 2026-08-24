"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Bot,
  CalendarDays,
  Check,
  CheckCircle2,
  CheckSquare,
  Clock,
  FolderGit2,
  FolderPlus,
  Inbox,
  Network,
  MoonStar,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
  User,
  Zap
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Panel } from "@/components/dashboard/panel";
import { agentRegistry } from "@/features/agents/registry";
import { getTodayFocus, getTodayTasks } from "@/features/life/calculations";
import type { AgentWorkItem } from "@/lib/data/models";
import { useMyOSData } from "@/lib/data/store";

type IntegrationStatus = {
  id: string;
  state: "connected" | "unconfigured" | "error";
};

type GoogleCalendarSnapshot = {
  events?: Array<{ id: string; summary: string; htmlLink: string; start: { date?: string; dateTime?: string } }>;
};

type GoogleTasksSnapshot = {
  tasks?: Array<{ id: string; title: string; status: "needsAction" | "completed"; due?: string }>;
};

type GoogleDriveSnapshot = {
  files?: Array<{ id: string; name: string; modifiedTime?: string }>;
};

function projectProgress(projectId: string, manualProgress: number, workItems: AgentWorkItem[]) {
  const items = workItems.filter((item) => item.projectId === projectId);
  if (!items.length) return manualProgress;
  return Math.round(items.reduce((total, item) => total + item.progress, 0) / items.length);
}

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: "早上好", icon: "Sunrise" as const };
  if (hour >= 12 && hour < 18) return { text: "下午好", icon: "Sun" as const };
  if (hour >= 18 && hour < 23) return { text: "晚上好", icon: "Sunset" as const };
  return { text: "夜深了", icon: "MoonStar" as const };
}

function DashboardGreeting() {
  const greeting = useMemo(() => getTimeGreeting(), []);
  const todayFormatted = useMemo(() => new Date().toLocaleDateString("zh-CN", {
    month: "numeric",
    day: "numeric",
    weekday: "short"
  }), []);
  const GreetingIcon = greeting.icon === "Sunrise" ? Sunrise : greeting.icon === "Sunset" ? Sunset : greeting.icon === "MoonStar" ? MoonStar : Sun;

  return (
    <section className="mobile-hero-greeting" aria-labelledby="today-heading">
      <div className="greeting-header">
        <div className="greeting-user-badge">
          <span className="greeting-avatar" aria-hidden>
            <User size={15} />
          </span>
          <span>
            <GreetingIcon size={15} aria-hidden />
            {greeting.text}
          </span>
        </div>
        <div className="greeting-date-pill">{todayFormatted}</div>
      </div>
      <div className="greeting-title-block">
        <h1 id="today-heading">今天要推进什么？</h1>
        <p>聚焦核心目标，保持行动心流。</p>
      </div>
    </section>
  );
}

export function DashboardClient() {
  const { data, toggleTask } = useMyOSData();
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [integrationError, setIntegrationError] = useState("");
  const [googleCalendar, setGoogleCalendar] = useState<GoogleCalendarSnapshot | null>(null);
  const [googleTasks, setGoogleTasks] = useState<GoogleTasksSnapshot | null>(null);
  const [googleDrive, setGoogleDrive] = useState<GoogleDriveSnapshot | null>(null);
  const [googleSyncError, setGoogleSyncError] = useState("");

  const todayFocus = getTodayFocus(data.tasks);
  const todayTasks = getTodayTasks(data.tasks);
  const unfinishedToday = todayTasks.filter((task) => !task.done);
  const pendingInbox = data.inbox.filter((item) => item.status === "pending");
  const activeProjects = data.projects.filter((project) => !["done", "archived"].includes(project.status)).slice(0, 4);
  const activeWork = data.agentWorkItems.filter((item) => item.status !== "completed");
  const openRisks = data.projectRisks.filter((risk) => risk.status === "open");
  const blockedWork = data.agentWorkItems.filter((item) => item.status === "blocked");
  const connectedIntegrations = integrations.filter((item) => item.state === "connected").length;
  const integrationHealth = integrations.length ? Math.round((connectedIntegrations / integrations.length) * 100) : null;

  const pulseProjects = useMemo(
    () =>
      activeProjects.map((project) => ({
        project,
        progress: projectProgress(project.id, project.manualProgress ?? 0, data.agentWorkItems),
        agentCount: new Set(data.agentWorkItems.filter((item) => item.projectId === project.id).map((item) => item.agentId)).size
      })),
    [activeProjects, data.agentWorkItems]
  );

  const heroTask = todayFocus[0];
  const remainingFocusTasks = todayFocus.slice(1);

  useEffect(() => {
    let alive = true;
    async function loadIntegrationStatus() {
      try {
        const response = await fetch("/api/integrations/status", { cache: "no-store" });
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.error || "读取连接状态失败。");
        const list: IntegrationStatus[] = body.integrations || [];
        if (alive) setIntegrations(list);
        if (list.some((item) => item.id.startsWith("google") && item.state === "connected")) {
                  }
      } catch (error) {
        if (alive) setIntegrationError(error instanceof Error ? error.message : "读取连接状态失败。");
      }
    }
    async function loadGoogleSnapshot() {
      const [calendarResponse, tasksResponse, driveResponse] = await Promise.all([
        fetch("/api/integrations/google/calendar/summary", { cache: "no-store" }),
        fetch("/api/integrations/google/tasks/summary", { cache: "no-store" }),
        fetch("/api/integrations/google/drive/summary", { cache: "no-store" })
      ]);
      const [calendarBody, tasksBody, driveBody] = await Promise.all([
        calendarResponse.json().catch(() => null),
        tasksResponse.json().catch(() => null),
        driveResponse.json().catch(() => null)
      ]);
      if (!alive) return;
      const failures = [calendarBody, tasksBody, driveBody].filter((body) => body?.error && !String(body.error).includes("未配置"));
      setGoogleCalendar(calendarResponse.ok ? calendarBody : null);
      setGoogleTasks(tasksResponse.ok ? tasksBody : null);
      setGoogleDrive(driveResponse.ok ? driveBody : null);
      setGoogleSyncError(failures.length ? "部分 Google 数据暂时无法读取，请到连接看板查看原因。" : "");
    }
    void loadIntegrationStatus();
    void loadGoogleSnapshot();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      <DashboardGreeting />

      <div className="dashboard-command-row">
        <div className="dashboard-search-shell">
          <Search size={17} aria-hidden />
          <input type="search" placeholder="搜索任务、项目或笔记" aria-label="搜索 MyOS" readOnly />
        </div>
        <Link className="dashboard-filter-button" href="/app/settings" aria-label="打开筛选设置">
          <SlidersHorizontal size={17} aria-hidden />
        </Link>
      </div>

      <div className="dashboard-service-row" aria-label="快捷服务">
        {[
          { label: "收件箱", icon: Inbox, href: "/app/inbox", tone: "aqua" },
          { label: "任务", icon: CheckSquare, href: "/app/tasks", tone: "mint" },
          { label: "项目", icon: FolderGit2, href: "/app/projects", tone: "amber" },
          { label: "设置", icon: Settings2, href: "/app/settings", tone: "blush" }
        ].map((service) => (
          <Link className={`dashboard-service ${service.tone}`} href={service.href} key={service.label}>
            <span className="dashboard-service-icon">
              <service.icon size={20} aria-hidden />
            </span>
            <span>{service.label}</span>
          </Link>
        ))}
      </div>

      <div className="metrics-capsule-row" aria-label="核心指标">
        <Link className="metric-capsule-card" href="/app/tasks">
          <div className="metric-icon-circle" style={{ background: "var(--pastel-mint-bg)", color: "var(--pastel-mint-text)" }}>
            <CheckSquare size={18} />
          </div>
          <strong>{unfinishedToday.length}</strong>
          <span>今日待办</span>
        </Link>

        <Link className="metric-capsule-card" href="/app/projects">
          <div className="metric-icon-circle" style={{ background: "var(--pastel-coral-bg)", color: "var(--pastel-coral-text)" }}>
            <FolderGit2 size={18} />
          </div>
          <strong>{activeProjects.length}</strong>
          <span>推进项目</span>
        </Link>

        <Link className="metric-capsule-card" href="/app/ai">
          <div className="metric-icon-circle" style={{ background: "var(--pastel-lavender-bg)", color: "var(--pastel-lavender-text)" }}>
            <Sparkles size={18} />
          </div>
          <strong>{activeWork.length}</strong>
          <span>Agent 任务</span>
        </Link>
      </div>

      {/* 3. Pastel Quick Access Grid (Reference Image 2 & 4) */}
      <div className="pastel-quick-grid" aria-label="快捷入口">
        <Link className="pastel-card blush" href="/app/inbox">
          <div className="squircle-icon">
            <Inbox size={20} />
          </div>
          <div className="pastel-card-text">
            <strong>闪念收件箱</strong>
            <small>{pendingInbox.length} 条待整理</small>
          </div>
        </Link>

        <Link className="pastel-card coral" href="/app/projects">
          <div className="squircle-icon">
            <FolderPlus size={20} />
          </div>
          <div className="pastel-card-text">
            <strong>新建项目</strong>
            <small>设定里程碑</small>
          </div>
        </Link>

        <Link className="pastel-card mint" href="/app/tasks">
          <div className="squircle-icon">
            <CheckSquare size={20} />
          </div>
          <div className="pastel-card-text">
            <strong>任务计划</strong>
            <small>{todayTasks.length} 项日程</small>
          </div>
        </Link>

        <Link className="pastel-card lavender" href="/app/ai">
          <div className="squircle-icon">
            <Bot size={20} />
          </div>
          <div className="pastel-card-text">
            <strong>AI 工作台</strong>
            <small>多模型助手</small>
          </div>
        </Link>
      </div>

      <div className="dashboard-stats-strip" aria-label="今日统计">
        <div className="dashboard-progress-ring">
          <span className="progress-ring-value">
            <strong>{todayTasks.length ? Math.round(((todayTasks.length - unfinishedToday.length) / todayTasks.length) * 100) : 0}%</strong>
            <small>今日完成</small>
          </span>
        </div>
        <div className="dashboard-stat-list">
          <div>
            <i className="stat-dot mint" aria-hidden />
            <span>已完成</span>
            <b>{todayTasks.length - unfinishedToday.length}</b>
          </div>
          <div>
            <i className="stat-dot aqua" aria-hidden />
            <span>待处理</span>
            <b>{unfinishedToday.length}</b>
          </div>
          <div>
            <i className="stat-dot lavender" aria-hidden />
            <span>Agent</span>
            <b>{activeWork.length}</b>
          </div>
        </div>
      </div>

      {/* 4. Dashboard Main Layout: Timeline & Focus + Pulse */}
      <div className="simplified-dashboard">
        <div className="today-primary">
          <Panel title="今日重点与时间线" action={<Link className="panel-link" href="/app/tasks">全部任务</Link>}>
            <div className="timeline-container">
              {/* 4.1 Hero Highlight Card (Top Focus Task - Reference Image 1) */}
              {heroTask ? (
                <div className="hero-task-card" onClick={() => toggleTask(heroTask.id)} style={{ cursor: "pointer" }}>
                  <div className="hero-task-top">
                    <span className="hero-task-badge">
                      <Zap size={13} /> 今日焦点 #1
                    </span>
                    <span className="hero-task-time">
                      <Clock size={13} style={{ display: "inline", marginRight: 4 }} />
                      {heroTask.due || "今日完成"}
                    </span>
                  </div>

                  <h3 className="hero-task-title">{heroTask.title}</h3>
                  <p className="hero-task-desc">所属项目：{heroTask.project || "默认空间"}</p>

                  <div className="hero-task-footer">
                    <button
                      className={`hero-checkbox-btn ${heroTask.done ? "completed" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        void toggleTask(heroTask.id);
                      }}
                      type="button"
                    >
                      {heroTask.done ? <CheckCircle2 size={16} /> : <Check size={16} />}
                      <span>{heroTask.done ? "已完成" : "点击完成"}</span>
                    </button>
                    <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>优先级：{heroTask.priority}</span>
                  </div>
                </div>
              ) : (
                <div className="empty-state">今天还没有重点任务。去任务中心标记 1~3 件最重要的事情。</div>
              )}

              {/* 4.2 Secondary Timeline Tasks (Reference Image 1) */}
              {remainingFocusTasks.map((task) => (
                <div className="timeline-item" key={task.id}>
                  <div className="timeline-axis">
                    <div className={`timeline-node ${task.done ? "done" : ""}`} />
                    <div className="timeline-line" />
                  </div>
                  <div className="timeline-card" onClick={() => toggleTask(task.id)} style={{ cursor: "pointer" }}>
                    <div className="timeline-card-main">
                      <button
                        className={`custom-checkbox ${task.done ? "checked" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          void toggleTask(task.id);
                        }}
                        type="button"
                        aria-label={task.done ? "标记为未完成" : "标记为已完成"}
                      >
                        {task.done ? <Check size={14} /> : null}
                      </button>
                      <div>
                        <div className={`timeline-card-title ${task.done ? "done" : ""}`}>{task.title}</div>
                        <div className="timeline-card-meta">{task.project || "未关联项目"}</div>
                      </div>
                    </div>
                    <span className="timeline-card-due">{task.due || "待定"}</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {/* Project Pulse List */}
          <Panel title="项目脉冲" action={<Link className="panel-link" href="/app/projects">项目中心</Link>}>
            <div className="project-pulse-list">
              {pulseProjects.length ? (
                pulseProjects.map(({ project, progress, agentCount }) => (
                  <Link className="project-pulse" href={`/app/projects/${project.id}`} key={project.id}>
                    <div className="project-pulse-top">
                      <span>
                        <strong>{project.name}</strong>
                        <small>
                          {project.category} · {project.nextAction}
                        </small>
                      </span>
                      <b>{progress}%</b>
                    </div>
                    <div className="pulse-bar" aria-label={`${project.name} 进度 ${progress}%`}>
                      <span style={{ width: `${progress}%` }} />
                    </div>
                    <div className="project-pulse-meta">
                      <span>{project.status}</span>
                      <span>{agentCount ? `${agentCount} 个 Agent 参与` : "等待拆分工作项"}</span>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="empty-state">还没有进行中的项目。用模板创建一个项目即可开始。</div>
              )}
            </div>
          </Panel>
        </div>

        {/* Side Panels */}
        <aside className="today-side">
          <Panel title="待处理收件箱" action={<Link className="panel-link" href="/app/inbox">打开收件箱</Link>}>
            <div className="table-list">
              {pendingInbox.slice(0, 4).map((item) => (
                <div className="row" key={item.id}>
                  <span>
                    <span className="row-title">{item.title}</span>
                    <span className="row-subtitle">
                      {item.type} · {item.category}
                    </span>
                  </span>
                  <span className="badge">待处理</span>
                </div>
              ))}
              {!pendingInbox.length ? <div className="empty-state compact">收件箱已清空。想到什么就先快速记录。</div> : null}
            </div>
          </Panel>

          <Panel title="Agent 队列" action={<Link className="panel-link" href="/app/projects">查看项目</Link>}>
            <div className="table-list">
              {activeWork.slice(0, 4).map((item) => {
                const agent = agentRegistry.find((entry) => entry.id === item.agentId);
                return (
                  <div className="row" key={item.id}>
                    <span>
                      <span className="row-title">{item.title}</span>
                      <span className="row-subtitle">
                        {agent?.name || item.agentId} · {item.status === "blocked" ? "需要处理" : "正在推进"}
                      </span>
                    </span>
                    <span className={`badge ${item.status === "blocked" ? "warning" : "active"}`}>{item.progress}%</span>
                  </div>
                );
              })}
              {!activeWork.length ? <div className="empty-state compact">在项目详情添加 Agent 和工作项后，这里会自动显示进度。</div> : null}
            </div>
          </Panel>

          <Panel title="需要决策" action={<Link className="panel-link" href="/app/projects">处理风险</Link>}>
            <div className="table-list">
              {blockedWork.slice(0, 2).map((item) => (
                <Link className="row-link" href={`/app/projects/${item.projectId}`} key={`blocked-${item.id}`}>
                  <div className="row">
                    <span>
                      <span className="row-title">Agent 被阻塞</span>
                      <span className="row-subtitle">{item.title} · {item.blockedReason || "等待你的决定"}</span>
                    </span>
                    <span className="badge warning">处理</span>
                  </div>
                </Link>
              ))}
              {openRisks.slice(0, 2).map((risk) => (
                <Link className="row-link" href={`/app/projects/${risk.projectId}`} key={`risk-${risk.id}`}>
                  <div className="row">
                    <span>
                      <span className="row-title">项目风险：{risk.title}</span>
                      <span className="row-subtitle">{risk.mitigation || "还没有缓解方案"}</span>
                    </span>
                    <span className={`badge ${risk.severity === "high" ? "failed" : "warning"}`}>{risk.severity === "high" ? "高" : "查看"}</span>
                  </div>
                </Link>
              ))}
              {!blockedWork.length && !openRisks.length ? <div className="empty-state compact">目前没有需要你决定的项目风险。</div> : null}
            </div>
          </Panel>

          <Panel title="系统概况" action={<Link className="panel-link" href="/app/integrations">连接看板</Link>}>
            <div className="system-summary">
              <div className="system-summary-icon">
                <Network size={17} aria-hidden />
              </div>
              <div>
                <strong>{integrationHealth === null ? "正在检查连接" : `连接健康度 ${integrationHealth}%`}</strong>
                <p>
                  {integrationError ? (
                    <>
                      <AlertTriangle size={14} aria-hidden /> {integrationError}
                    </>
                  ) : integrations.length ? (
                    `${connectedIntegrations}/${integrations.length} 个外部服务已连接`
                  ) : (
                    "尚未读取到外部服务状态"
                  )}
                </p>
              </div>
            </div>
          </Panel>

          <Panel title="Google 同步状态" action={<Link className="panel-link" href="/app/integrations">管理同步</Link>}>
            {googleSyncError ? <p className="row-subtitle" style={{ whiteSpace: "normal", padding: "0 14px 12px" }}>{googleSyncError}</p> : null}
            <div className="table-list">
              <div className="row">
                <span>
                  <span className="row-title">
                    <CalendarDays size={15} aria-hidden /> 日历
                  </span>
                  <span className="row-subtitle">未来 7 天</span>
                </span>
                <strong>{googleCalendar ? `${googleCalendar.events?.length || 0} 项` : "未连接"}</strong>
              </div>
              <div className="row">
                <span>
                  <span className="row-title">
                    <CheckSquare size={15} aria-hidden /> Tasks
                  </span>
                  <span className="row-subtitle">未完成任务</span>
                </span>
                <strong>{googleTasks ? `${googleTasks.tasks?.filter((task) => task.status !== "completed").length || 0} 项` : "未连接"}</strong>
              </div>
              <div className="row">
                <span>
                  <span className="row-title">Drive</span>
                  <span className="row-subtitle">最近文件元数据</span>
                </span>
                <strong>{googleDrive ? `${googleDrive.files?.length || 0} 个` : "未连接"}</strong>
              </div>
            </div>
          </Panel>
        </aside>
      </div>
    </>
  );
}



