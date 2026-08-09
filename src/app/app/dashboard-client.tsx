"use client";

import Link from "next/link";
import { AlertTriangle, CheckSquare, Inbox, Network, Plus, Sparkles } from "lucide-react";
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

function projectProgress(projectId: string, manualProgress: number, workItems: AgentWorkItem[]) {
  const items = workItems.filter((item) => item.projectId === projectId);
  if (!items.length) return manualProgress;
  return Math.round(items.reduce((total, item) => total + item.progress, 0) / items.length);
}

export function DashboardClient() {
  const { data, toggleTask } = useMyOSData();
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [integrationError, setIntegrationError] = useState("");
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
  const pulseProjects = useMemo(() => activeProjects.map((project) => ({
    project,
    progress: projectProgress(project.id, project.manualProgress ?? 0, data.agentWorkItems),
    agentCount: new Set(data.agentWorkItems.filter((item) => item.projectId === project.id).map((item) => item.agentId)).size
  })), [activeProjects, data.agentWorkItems]);

  useEffect(() => {
    let alive = true;
    async function loadIntegrationStatus() {
      try {
        const response = await fetch("/api/integrations/status", { cache: "no-store" });
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.error || "读取连接状态失败。");
        if (alive) setIntegrations(body.integrations || []);
      } catch (error) {
        if (alive) setIntegrationError(error instanceof Error ? error.message : "读取连接状态失败。");
      }
    }
    void loadIntegrationStatus();
    return () => { alive = false; };
  }, []);

  return (
    <>
      <section className="focus-overview" aria-labelledby="today-heading">
        <div className="hero-copy">
          <span className="eyebrow">每日控制台</span>
          <h1 id="today-heading">今天要推进什么？</h1>
          <p>{new Date().toLocaleDateString("zh-CN", { weekday: "long", month: "long", day: "numeric" })}。先完成最重要的三件事。</p>
        </div>
        <div className="focus-overview-stats" aria-label="工作台概览">
          <div><span>今日待办</span><strong>{unfinishedToday.length}</strong></div>
          <div><span>推进项目</span><strong>{activeProjects.length}</strong></div>
          <div><span>Agent 工作</span><strong>{activeWork.length}</strong></div>
        </div>
      </section>

      <div className="action-dock simplified-dock" aria-label="快捷入口">
        <Link className="action-pill primary-action" href="/app/projects"><Plus size={16} aria-hidden />新建项目</Link>
        <Link className="action-pill" href="/app/inbox"><Inbox size={16} aria-hidden />快速记录</Link>
        <Link className="action-pill" href="/app/tasks"><CheckSquare size={16} aria-hidden />管理任务</Link>
        <Link className="action-pill" href="/app/integrations"><Network size={16} aria-hidden />查看连接</Link>
      </div>

      <div className="simplified-dashboard">
        <div className="today-primary">
          <Panel title="今日重点" action={<Link className="panel-link" href="/app/tasks">全部任务</Link>}>
            <div className="table-list">
              {todayFocus.length ? todayFocus.map((task) => (
                <label className="row focus-task-row" key={task.id}>
                  <span className="task-cell">
                    <input checked={task.done} onChange={() => toggleTask(task.id)} type="checkbox" />
                    <span><span className="row-title">{task.title}</span><span className="row-subtitle">{task.project || "未关联项目"}</span></span>
                  </span>
                  <span className={`badge ${task.priority}`}>{task.done ? "完成" : task.due}</span>
                </label>
              )) : <div className="empty-state">今天还没有重点。新建任务后，最多保留三项最重要的事。</div>}
            </div>
          </Panel>

          <Panel title="项目脉冲" action={<Link className="panel-link" href="/app/projects">项目中心</Link>}>
            <div className="project-pulse-list">
              {pulseProjects.length ? pulseProjects.map(({ project, progress, agentCount }) => (
                <Link className="project-pulse" href={`/app/projects/${project.id}`} key={project.id}>
                  <div className="project-pulse-top"><span><strong>{project.name}</strong><small>{project.category} · {project.nextAction}</small></span><b>{progress}%</b></div>
                  <div className="pulse-bar" aria-label={`${project.name} 进度 ${progress}%`}><span style={{ width: `${progress}%` }} /></div>
                  <div className="project-pulse-meta"><span>{project.status}</span><span>{agentCount ? `${agentCount} 个 Agent 参与` : "等待拆分工作项"}</span></div>
                </Link>
              )) : <div className="empty-state">还没有进行中的项目。用模板创建一个项目即可开始。</div>}
            </div>
          </Panel>
        </div>

        <aside className="today-side">
          <Panel title="待处理收件箱" action={<Link className="panel-link" href="/app/inbox">打开收件箱</Link>}>
            <div className="table-list">
              {pendingInbox.slice(0, 4).map((item) => <div className="row" key={item.id}><span><span className="row-title">{item.title}</span><span className="row-subtitle">{item.type} · {item.category}</span></span><span className="badge">待处理</span></div>)}
              {!pendingInbox.length ? <div className="empty-state compact">收件箱已清空。想到什么就先快速记录。</div> : null}
            </div>
          </Panel>

          <Panel title="Agent 队列" action={<Link className="panel-link" href="/app/projects">查看项目</Link>}>
            <div className="table-list">
              {activeWork.slice(0, 4).map((item) => {
                const agent = agentRegistry.find((entry) => entry.id === item.agentId);
                return <div className="row" key={item.id}><span><span className="row-title">{item.title}</span><span className="row-subtitle">{agent?.name || item.agentId} · {item.status === "blocked" ? "需要处理" : "正在推进"}</span></span><span className={`badge ${item.status === "blocked" ? "warning" : "active"}`}>{item.progress}%</span></div>;
              })}
              {!activeWork.length ? <div className="empty-state compact">在项目详情添加 Agent 和工作项后，这里会自动显示进度。</div> : null}
            </div>
          </Panel>

          <Panel title="需要决策" action={<Link className="panel-link" href="/app/projects">处理风险</Link>}>
            <div className="table-list">
              {blockedWork.slice(0, 2).map((item) => <Link className="row-link" href={`/app/projects/${item.projectId}`} key={`blocked-${item.id}`}><div className="row"><span><span className="row-title">Agent 被阻塞</span><span className="row-subtitle">{item.title} · {item.blockedReason || "等待你的决定"}</span></span><span className="badge warning">处理</span></div></Link>)}
              {openRisks.slice(0, 2).map((risk) => <Link className="row-link" href={`/app/projects/${risk.projectId}`} key={`risk-${risk.id}`}><div className="row"><span><span className="row-title">项目风险：{risk.title}</span><span className="row-subtitle">{risk.mitigation || "还没有缓解方案"}</span></span><span className={`badge ${risk.severity === "high" ? "failed" : "warning"}`}>{risk.severity === "high" ? "高" : "查看"}</span></div></Link>)}
              {!blockedWork.length && !openRisks.length ? <div className="empty-state compact">目前没有需要你决定的项目风险。</div> : null}
            </div>
          </Panel>

          <Panel title="系统概况" action={<Link className="panel-link" href="/app/integrations">连接看板</Link>}>
            <div className="system-summary">
              <div className="system-summary-icon"><Network size={17} aria-hidden /></div>
              <div><strong>{integrationHealth === null ? "正在检查连接" : `连接健康度 ${integrationHealth}%`}</strong><p>{integrationError ? <><AlertTriangle size={14} aria-hidden /> {integrationError}</> : integrations.length ? `${connectedIntegrations}/${integrations.length} 个外部服务已连接` : "尚未读取到外部服务状态"}</p></div>
            </div>
          </Panel>
        </aside>
      </div>

      <div className="dashboard-guidance"><Sparkles size={16} aria-hidden /><span>复杂功能仍可通过顶部搜索或“更多功能”打开；首页只保留今天需要决策的信息。</span></div>
    </>
  );
}
