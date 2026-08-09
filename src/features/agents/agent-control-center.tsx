"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Bot, CheckCircle2, CircleDashed, ClipboardPlus, FolderKanban, PauseCircle, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { agentRegistry, getAgent } from "@/features/agents/registry";
import { postMyOSAction, publishMyOSData } from "@/lib/data/client-actions";
import { useMyOSData } from "@/lib/data/store";

function projectProgress(projectId: string, manualProgress: number, workItems: ReturnType<typeof useMyOSData>["data"]["agentWorkItems"], mode?: "manual" | "agent_work") {
  const items = workItems.filter((item) => item.projectId === projectId);
  if (mode !== "manual" && items.length) return Math.round(items.reduce((total, item) => total + item.progress, 0) / items.length);
  return manualProgress;
}

export function AgentControlCenter() {
  const { data } = useMyOSData();
  const [projectId, setProjectId] = useState("");
  const [agentId, setAgentId] = useState("codex");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [message, setMessage] = useState("");
  const [dispatchError, setDispatchError] = useState("");
  const [dispatching, setDispatching] = useState(false);
  const running = data.agentWorkItems.filter((item) => item.status === "in_progress");
  const blocked = data.agentWorkItems.filter((item) => item.status === "blocked");
  const queued = data.agentWorkItems.filter((item) => item.status === "queued");
  const activeProjects = data.projects.filter((project) => data.agentAssignments.some((assignment) => assignment.projectId === project.id) || data.agentWorkItems.some((item) => item.projectId === project.id));
  const latestReports = [...data.agentReports].slice(0, 5);
  const dispatchProjects = useMemo(() => data.projects.filter((project) => project.status !== "archived" && project.status !== "done"), [data.projects]);

  useEffect(() => {
    if (!projectId && dispatchProjects[0]) setProjectId(dispatchProjects[0].id);
  }, [dispatchProjects, projectId]);

  function chooseTemplate(nextTitle: string, nextInstructions: string) {
    setTitle(nextTitle);
    setInstructions(nextInstructions);
    setMessage("");
    setDispatchError("");
  }

  async function dispatch() {
    if (!projectId || !title.trim() || !instructions.trim()) return;
    setMessage("");
    setDispatchError("");
    setDispatching(true);
    try {
      const next = await postMyOSAction({
        type: "addAgentWorkItem",
        payload: {
          projectId,
          agentId: agentId as "codex" | "claude-code" | "opencode" | "hermes" | "openclaw",
          title: title.trim(),
          instructions: instructions.trim()
        }
      });
      publishMyOSData(next);
      setTitle("");
      setInstructions("");
      setMessage("工作项已加入队列。Agent 需要在项目内领取、推进并提交汇报。");
    } catch (dispatchFailure) {
      setDispatchError(dispatchFailure instanceof Error ? dispatchFailure.message : "派发工作失败，请稍后重试。");
    } finally {
      setDispatching(false);
    }
  }

  return (
    <>
      <div className="page-header agent-control-header">
        <div>
          <p className="eyebrow"><Bot size={14} aria-hidden /> Agent OS</p>
          <h1>Agent 控制中心</h1>
          <p>查看项目执行情况、阻塞项和最新汇报。所有状态来自项目中的 Agent 记录。</p>
        </div>
        <Link className="text-button" href="/app/projects"><FolderKanban size={16} aria-hidden />项目中心</Link>
      </div>

      <section className="agent-control-metrics" aria-label="Agent 执行概览">
        <div><CircleDashed size={18} aria-hidden /><span>进行中<strong>{running.length}</strong></span></div>
        <div><AlertTriangle size={18} aria-hidden /><span>需要处理<strong>{blocked.length}</strong></span></div>
        <div><PauseCircle size={18} aria-hidden /><span>待领取<strong>{queued.length}</strong></span></div>
        <div><CheckCircle2 size={18} aria-hidden /><span>已关联项目<strong>{activeProjects.length}</strong></span></div>
      </section>

      <section className="agent-dispatch panel" aria-labelledby="agent-dispatch-heading">
        <div className="agent-dispatch-copy"><p className="eyebrow"><ClipboardPlus size={14} aria-hidden /> 统一派发</p><h2 id="agent-dispatch-heading">把一件明确的工作交给 Agent</h2><p>MyOS 只记录真实任务、进度与汇报；创建后再由对应 Agent 通过项目上下文、CLI 或 MCP 执行。</p></div>
        <div className="agent-dispatch-templates" aria-label="工作模板">
          <button type="button" onClick={() => chooseTemplate("梳理项目现状", "先阅读项目简报、技术栈和现有工作项，输出当前风险、下一步与建议拆分。")}>梳理现状</button>
          <button type="button" onClick={() => chooseTemplate("实现下一项功能", "先阅读项目简报和现有代码，完成当前下一步行动，运行相关检查后提交进度汇报。")}>实现功能</button>
          <button type="button" onClick={() => chooseTemplate("审查项目风险", "检查当前项目的未完成工作、阻塞项与关键技术风险，给出可执行的修复优先级。")}>审查风险</button>
        </div>
        <div className="agent-dispatch-form">
          <select value={projectId} onChange={(event) => setProjectId(event.target.value)} aria-label="选择项目"><option value="">选择项目</option>{dispatchProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>
          <select value={agentId} onChange={(event) => setAgentId(event.target.value)} aria-label="选择 Agent">{agentRegistry.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select>
          <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} placeholder="这件工作要完成什么？" aria-label="工作标题" />
          <textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} maxLength={4000} placeholder="补充范围、约束、验收方式或要读取的资料。" aria-label="工作说明" />
          <button className="primary-button" type="button" onClick={() => void dispatch()} disabled={dispatching || !projectId || !title.trim() || !instructions.trim()}><Send size={15} aria-hidden />{dispatching ? "派发中" : "加入 Agent 队列"}</button>
        </div>
        {message ? <p className="config-message">{message}</p> : null}{dispatchError ? <p className="form-error">{dispatchError}</p> : null}
      </section>

      <div className="agent-control-layout">
        <section className="panel">
          <div className="panel-header"><h2>项目健康</h2><Link className="panel-link" href="/app/projects">全部项目</Link></div>
          <div className="agent-project-health-list">
            {activeProjects.length ? activeProjects.map((project) => {
              const projectItems = data.agentWorkItems.filter((item) => item.projectId === project.id);
              const projectBlocked = projectItems.filter((item) => item.status === "blocked").length;
              const progress = projectProgress(project.id, project.manualProgress ?? 0, data.agentWorkItems, project.progressMode);
              return <Link className="agent-project-health" href={`/app/projects/${project.id}`} key={project.id}>
                <div><span className="agent-project-health-title"><strong>{project.name}</strong><small>{project.techStack?.length ? project.techStack.join(" · ") : project.category}</small></span><b>{progress}%</b></div>
                <div className="pulse-bar"><span style={{ width: `${progress}%` }} /></div>
                <footer><span>{projectBlocked ? `${projectBlocked} 项阻塞` : project.nextAction}</span><span>{projectItems.length} 个工作项 <ArrowRight size={14} aria-hidden /></span></footer>
              </Link>;
            }) : <div className="empty-state">先在项目详情中分配一个 Agent，项目健康状态会自动出现在这里。</div>}
          </div>
        </section>

        <aside className="agent-control-side">
          <section className="panel">
            <div className="panel-header"><h2>需要你决定</h2></div>
            <div className="table-list">
              {blocked.map((item) => {
                const project = data.projects.find((entry) => entry.id === item.projectId);
                return <Link className="row-link" href={`/app/projects/${item.projectId}`} key={item.id}><div className="row"><span><span className="row-title">{item.title}</span><span className="row-subtitle">{project?.name || "未知项目"} · {getAgent(item.agentId)?.name || item.agentId}</span></span><span className="badge warning">阻塞</span></div></Link>;
              })}
              {!blocked.length ? <div className="empty-state compact">目前没有 Agent 报告阻塞项。</div> : null}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header"><h2>最新汇报</h2></div>
            <div className="agent-control-reports">
              {latestReports.map((report) => {
                const project = data.projects.find((entry) => entry.id === report.projectId);
                return <Link href={`/app/projects/${report.projectId}`} key={report.id}><strong>{getAgent(report.agentId)?.name || report.agentId} · {report.progress}%</strong><span>{report.summary}</span><small>{project?.name || "未知项目"} · {report.createdAt}</small></Link>;
              })}
              {!latestReports.length ? <div className="empty-state compact">Agent 提交汇报后会集中显示在这里。</div> : null}
            </div>
          </section>
        </aside>
      </div>

      <section className="panel agent-capacity-panel">
        <div className="panel-header"><h2>Agent 分工</h2><span className="row-subtitle">只有被分配的 Agent 才计入项目执行</span></div>
        <div className="agent-capacity-list">
          {agentRegistry.map((agent) => {
            const Icon = agent.icon;
            const assignments = data.agentAssignments.filter((assignment) => assignment.agentId === agent.id);
            const work = data.agentWorkItems.filter((item) => item.agentId === agent.id);
            return <div className="agent-capacity" key={agent.id}><Icon size={19} aria-hidden /><span><strong>{agent.name}</strong><small>{agent.description}</small></span><span className="agent-capacity-meta">{assignments.length} 项目 · {work.filter((item) => item.status === "in_progress").length} 进行中</span></div>;
          })}
        </div>
      </section>
    </>
  );
}
