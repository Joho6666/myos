"use client";

import { useMemo, useState } from "react";
import { Bot, CheckCircle2, FileText, Plus, Settings2, Workflow } from "lucide-react";
import { agentRegistry, getAgent, type KnownAgentId } from "@/features/agents/registry";
import { postMyOSAction, publishMyOSData } from "@/lib/data/client-actions";
import type { MyOSData, Project } from "@/lib/data/models";

type ProjectAgentWorkspaceProps = {
  project: Project;
  data: MyOSData;
};

function calculateProgress(project: Project, data: MyOSData) {
  const items = data.agentWorkItems.filter((item) => item.projectId === project.id);
  if (project.progressMode !== "manual" && items.length) {
    return Math.round(items.reduce((total, item) => total + item.progress, 0) / items.length);
  }
  return project.manualProgress ?? 0;
}

export function ProjectAgentWorkspace({ project, data }: ProjectAgentWorkspaceProps) {
  const [summary, setSummary] = useState(project.summary || "");
  const [techStack, setTechStack] = useState((project.techStack || []).join(", "));
  const [progressMode, setProgressMode] = useState(project.progressMode || "agent_work");
  const [manualProgress, setManualProgress] = useState(project.manualProgress ?? 0);
  const [agentId, setAgentId] = useState<KnownAgentId>("codex");
  const [role, setRole] = useState("主开发");
  const [workTitle, setWorkTitle] = useState("");
  const [workInstructions, setWorkInstructions] = useState("");
  const [reportSummary, setReportSummary] = useState("");
  const [reportWorkItemId, setReportWorkItemId] = useState("");
  const [reportProgress, setReportProgress] = useState(0);
  const [reportBlockedReason, setReportBlockedReason] = useState("");
  const [reportTestResult, setReportTestResult] = useState("");
  const [reportChangedFiles, setReportChangedFiles] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const assignments = useMemo(() => data.agentAssignments.filter((item) => item.projectId === project.id), [data.agentAssignments, project.id]);
  const workItems = useMemo(() => data.agentWorkItems.filter((item) => item.projectId === project.id), [data.agentWorkItems, project.id]);
  const reports = useMemo(() => data.agentReports.filter((item) => item.projectId === project.id), [data.agentReports, project.id]);
  const assignedAgentIds = assignments.map((item) => item.agentId);
  const progress = calculateProgress(project, data);

  async function run(action: Parameters<typeof postMyOSAction>[0], success: string) {
    setBusy(action.type);
    setError("");
    setMessage("");
    try {
      const next = await postMyOSAction(action);
      publishMyOSData(next);
      setMessage(success);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "操作未完成。");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="panel agent-workspace" aria-labelledby="agent-workspace-heading">
      <div className="agent-workspace-header">
        <div>
          <p className="eyebrow"><Bot size={14} aria-hidden /> Agent OS</p>
          <h2 id="agent-workspace-heading">项目执行控制台</h2>
          <p>让 Agent 读取项目上下文、领取工作、提交进度和汇报。</p>
        </div>
        <div className="project-progress-ring" aria-label={`项目进度 ${progress}%`}>
          <strong>{progress}%</strong><span>{project.progressMode === "manual" ? "手动" : "工作项"}</span>
        </div>
      </div>

      {message ? <p className="config-message">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      <div className="agent-overview-grid">
        <section className="agent-section">
          <div className="agent-section-heading"><Settings2 size={16} aria-hidden /><h3>项目上下文</h3></div>
          <label>项目简介<textarea value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="这个项目解决什么问题，当前阶段是什么？" /></label>
          <label>技术栈<input value={techStack} onChange={(event) => setTechStack(event.target.value)} placeholder="Next.js, Supabase, Python" /></label>
          <div className="agent-config-row">
            <label>进度来源<select value={progressMode} onChange={(event) => setProgressMode(event.target.value as "manual" | "agent_work")}><option value="agent_work">Agent 工作项</option><option value="manual">手动维护</option></select></label>
            <label>手动进度<input type="number" min="0" max="100" value={manualProgress} onChange={(event) => setManualProgress(Number(event.target.value))} disabled={progressMode !== "manual"} /></label>
          </div>
          <button className="text-button" type="button" disabled={busy === "updateProjectAgentProfile"} onClick={() => void run({ type: "updateProjectAgentProfile", payload: { projectId: project.id, summary, techStack: techStack.split(",").map((item) => item.trim()).filter(Boolean), progressMode, manualProgress } }, "项目上下文已保存。")}>
            保存上下文
          </button>
        </section>

        <section className="agent-section">
          <div className="agent-section-heading"><Workflow size={16} aria-hidden /><h3>已分配 Agent</h3></div>
          <div className="agent-assignment-list">
            {assignments.length ? assignments.map((assignment) => {
              const agent = getAgent(assignment.agentId);
              const Icon = agent?.icon || Bot;
              return <div className="agent-assignment" key={assignment.id}><Icon size={17} aria-hidden /><span><strong>{agent?.name || assignment.agentId}</strong><small>{assignment.role}</small></span></div>;
            }) : <p className="empty-state">还没有分配 Agent。</p>}
          </div>
          <div className="agent-inline-form">
            <select value={agentId} onChange={(event) => setAgentId(event.target.value as KnownAgentId)}>{agentRegistry.map((agent) => <option value={agent.id} key={agent.id}>{agent.name}</option>)}</select>
            <input value={role} onChange={(event) => setRole(event.target.value)} placeholder="角色，例如主开发" />
            <button className="icon-button" type="button" aria-label="分配 Agent" disabled={!role.trim() || busy === "assignProjectAgent"} onClick={() => void run({ type: "assignProjectAgent", payload: { projectId: project.id, agentId, role } }, "Agent 已分配到项目。")}><Plus size={16} aria-hidden /></button>
          </div>
        </section>
      </div>

      <div className="agent-work-grid">
        <section className="agent-section">
          <div className="agent-section-heading"><CheckCircle2 size={16} aria-hidden /><h3>工作项</h3></div>
          <div className="agent-work-list">
            {workItems.map((item) => {
              const agent = getAgent(item.agentId);
              return <div className="agent-work-item" key={item.id}>
                <div><strong>{item.title}</strong><p>{agent?.name || item.agentId} · {item.instructions || "未补充执行说明"}</p></div>
                <div className="agent-work-controls"><select value={item.status} onChange={(event) => void run({ type: "updateAgentWorkItem", payload: { id: item.id, status: event.target.value as typeof item.status, progress: item.progress } }, "工作项状态已更新。")}><option value="queued">待领取</option><option value="in_progress">进行中</option><option value="blocked">已阻塞</option><option value="completed">已完成</option></select><input aria-label="工作项进度" type="number" min="0" max="100" value={item.progress} onChange={(event) => void run({ type: "updateAgentWorkItem", payload: { id: item.id, status: item.status, progress: Number(event.target.value) } }, "工作项进度已更新。")} /><span>%</span></div>
              </div>;
            })}
            {!workItems.length ? <p className="empty-state">暂无工作项。先分配 Agent，再拆出可执行任务。</p> : null}
          </div>
          <div className="agent-new-work">
            <select value={agentId} onChange={(event) => setAgentId(event.target.value as KnownAgentId)}>{agentRegistry.filter((agent) => assignedAgentIds.includes(agent.id)).map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select>
            <input value={workTitle} onChange={(event) => setWorkTitle(event.target.value)} placeholder="Agent 要完成的工作" />
            <textarea value={workInstructions} onChange={(event) => setWorkInstructions(event.target.value)} placeholder="完成标准、限制和需要读取的文件" />
            <button className="text-button" type="button" disabled={!workTitle.trim() || !assignedAgentIds.includes(agentId) || busy === "addAgentWorkItem"} onClick={() => void run({ type: "addAgentWorkItem", payload: { projectId: project.id, agentId, title: workTitle, instructions: workInstructions } }, "Agent 工作项已创建。")}><Plus size={15} aria-hidden /> 添加工作项</button>
          </div>
        </section>

        <section className="agent-section">
          <div className="agent-section-heading"><FileText size={16} aria-hidden /><h3>Agent 汇报</h3></div>
          <div className="agent-report-list">
            {reports.map((report) => <div className="agent-report" key={report.id}><strong>{getAgent(report.agentId)?.name || report.agentId} · {report.progress}%</strong><p>{report.summary}</p><small>{report.createdAt}</small></div>)}
            {!reports.length ? <p className="empty-state">暂无 Agent 汇报。</p> : null}
          </div>
          <div className="agent-new-report">
            <select value={agentId} onChange={(event) => setAgentId(event.target.value as KnownAgentId)}>{agentRegistry.filter((agent) => assignedAgentIds.includes(agent.id)).map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select>
            <select value={reportWorkItemId} onChange={(event) => setReportWorkItemId(event.target.value)}><option value="">关联整个项目</option>{workItems.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
            <input type="number" min="0" max="100" value={reportProgress} onChange={(event) => setReportProgress(Number(event.target.value))} aria-label="汇报进度" />
            <textarea value={reportSummary} onChange={(event) => setReportSummary(event.target.value)} placeholder="本次完成了什么、遇到什么阻塞、下一步是什么？" />
            <input value={reportBlockedReason} onChange={(event) => setReportBlockedReason(event.target.value)} placeholder="阻塞原因（可选）" />
            <input value={reportTestResult} onChange={(event) => setReportTestResult(event.target.value)} placeholder="测试结果（可选）" />
            <input value={reportChangedFiles} onChange={(event) => setReportChangedFiles(event.target.value)} placeholder="变更文件，用逗号分隔（可选）" />
            <button className="text-button" type="button" disabled={!reportSummary.trim() || !assignedAgentIds.includes(agentId) || busy === "addAgentReport"} onClick={() => void run({ type: "addAgentReport", payload: { projectId: project.id, workItemId: reportWorkItemId || undefined, agentId, summary: reportSummary, progress: reportProgress, blockedReason: reportBlockedReason || undefined, testResult: reportTestResult || undefined, changedFiles: reportChangedFiles.split(",").map((item) => item.trim()).filter(Boolean) } }, "Agent 汇报已保存。")}><FileText size={15} aria-hidden /> 保存汇报</button>
          </div>
        </section>
      </div>
    </section>
  );
}
