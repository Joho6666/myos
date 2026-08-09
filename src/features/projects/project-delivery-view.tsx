"use client";

import { AlertTriangle, CheckCircle2, CircleDashed, FileCode2, History, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { getAgent } from "@/features/agents/registry";
import { postMyOSAction, publishMyOSData } from "@/lib/data/client-actions";
import type { MyOSData, Project, ProjectMilestone, ProjectRisk } from "@/lib/data/models";

type ProjectDeliveryViewProps = {
  project: Project;
  data: MyOSData;
};

const milestoneStatusLabel: Record<ProjectMilestone["status"], string> = {
  planned: "计划中",
  in_progress: "进行中",
  completed: "已完成",
  blocked: "已阻塞"
};

const riskStatusLabel: Record<ProjectRisk["status"], string> = {
  open: "待处理",
  mitigated: "已缓解",
  accepted: "已接受"
};

const riskSeverityLabel: Record<ProjectRisk["severity"], string> = {
  low: "低",
  medium: "中",
  high: "高"
};

export function ProjectDeliveryView({ project, data }: ProjectDeliveryViewProps) {
  const [milestoneDraft, setMilestoneDraft] = useState({ title: "", description: "", status: "planned" as ProjectMilestone["status"], targetDate: "", progress: 0 });
  const [riskDraft, setRiskDraft] = useState({ title: "", severity: "medium" as ProjectRisk["severity"], status: "open" as ProjectRisk["status"], mitigation: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const milestones = useMemo(() => data.projectMilestones.filter((item) => item.projectId === project.id), [data.projectMilestones, project.id]);
  const risks = useMemo(() => data.projectRisks.filter((item) => item.projectId === project.id), [data.projectRisks, project.id]);
  const workItems = useMemo(() => data.agentWorkItems.filter((item) => item.projectId === project.id), [data.agentWorkItems, project.id]);
  const events = useMemo(() => data.agentWorkEvents.filter((item) => item.projectId === project.id).slice(0, 8), [data.agentWorkEvents, project.id]);
  const openRisks = risks.filter((risk) => risk.status === "open");
  const deliveryProgress = milestones.length ? Math.round(milestones.reduce((sum, milestone) => sum + milestone.progress, 0) / milestones.length) : project.manualProgress ?? 0;

  async function run(action: Parameters<typeof postMyOSAction>[0], success: string) {
    setBusy(action.type);
    setMessage("");
    setError("");
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

  async function addMilestone(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!milestoneDraft.title.trim()) return;
    await run({ type: "addProjectMilestone", payload: { projectId: project.id, ...milestoneDraft, title: milestoneDraft.title.trim(), description: milestoneDraft.description.trim() } }, "里程碑已添加。");
    setMilestoneDraft({ title: "", description: "", status: "planned", targetDate: "", progress: 0 });
  }

  async function addRisk(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!riskDraft.title.trim()) return;
    await run({ type: "addProjectRisk", payload: { projectId: project.id, ...riskDraft, title: riskDraft.title.trim(), mitigation: riskDraft.mitigation.trim() } }, "项目风险已记录。");
    setRiskDraft({ title: "", severity: "medium", status: "open", mitigation: "" });
  }

  function updateMilestone(milestone: ProjectMilestone, changes: Partial<ProjectMilestone>) {
    return run({ type: "updateProjectMilestone", payload: { id: milestone.id, title: milestone.title, description: milestone.description, status: changes.status || milestone.status, targetDate: changes.targetDate ?? milestone.targetDate, progress: changes.progress ?? milestone.progress } }, "里程碑已更新。");
  }

  function updateRisk(risk: ProjectRisk, status: ProjectRisk["status"]) {
    return run({ type: "updateProjectRisk", payload: { id: risk.id, title: risk.title, severity: risk.severity, status, mitigation: risk.mitigation } }, "风险状态已更新。");
  }

  return (
    <section className="project-delivery panel" aria-labelledby="project-delivery-heading">
      <div className="project-delivery-heading">
        <div>
          <p className="eyebrow"><CircleDashed size={14} aria-hidden /> 交付控制台</p>
          <h2 id="project-delivery-heading">里程碑、风险与执行证据</h2>
          <p>只看影响项目交付的状态，避免在多个页面之间来回整理。</p>
        </div>
        <div className="delivery-progress-summary"><strong>{deliveryProgress}%</strong><span>交付进度</span></div>
      </div>

      {message ? <p className="config-message">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      <div className="delivery-stats">
        <div><CheckCircle2 size={16} aria-hidden /><span>里程碑<strong>{milestones.filter((item) => item.status === "completed").length}/{milestones.length}</strong></span></div>
        <div><ShieldAlert size={16} aria-hidden /><span>开放风险<strong>{openRisks.length}</strong></span></div>
        <div><History size={16} aria-hidden /><span>执行事件<strong>{data.agentWorkEvents.filter((item) => item.projectId === project.id).length}</strong></span></div>
      </div>

      <div className="delivery-grid">
        <section className="delivery-section">
          <div className="delivery-section-heading"><span><CheckCircle2 size={16} aria-hidden /><h3>项目里程碑</h3></span><small>按交付结果拆分</small></div>
          <div className="delivery-list">
            {milestones.map((milestone) => (
              <div className="delivery-item" key={milestone.id}>
                <div className="delivery-item-main"><strong>{milestone.title}</strong><small>{milestone.description || "未补充说明"}</small></div>
                <div className="delivery-item-controls">
                  <select aria-label={`${milestone.title} 状态`} value={milestone.status} onChange={(event) => void updateMilestone(milestone, { status: event.target.value as ProjectMilestone["status"] })} disabled={busy === "updateProjectMilestone"}>
                    {Object.entries(milestoneStatusLabel).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                  </select>
                  <input aria-label={`${milestone.title} 进度`} type="number" min="0" max="100" value={milestone.progress} onChange={(event) => void updateMilestone(milestone, { progress: Number(event.target.value) })} />
                  <span>%</span>
                  <button className="icon-button danger-icon" type="button" aria-label={`删除${milestone.title}`} onClick={() => void run({ type: "deleteProjectMilestone", payload: { id: milestone.id } }, "里程碑已删除。")}><Trash2 size={14} aria-hidden /></button>
                </div>
                <div className="delivery-progress-bar"><span style={{ width: `${milestone.progress}%` }} /></div>
                <small className="delivery-item-date">目标 {milestone.targetDate || "未设置"}</small>
              </div>
            ))}
            {!milestones.length ? <p className="empty-state">还没有里程碑。先把项目拆成三个可验收的结果。</p> : null}
          </div>
          <form className="delivery-add-form" onSubmit={addMilestone}>
            <input value={milestoneDraft.title} onChange={(event) => setMilestoneDraft((current) => ({ ...current, title: event.target.value }))} placeholder="新里程碑，例如 Beta 版本" maxLength={200} required />
            <input value={milestoneDraft.description} onChange={(event) => setMilestoneDraft((current) => ({ ...current, description: event.target.value }))} placeholder="验收结果或范围" maxLength={4000} />
            <input type="date" value={milestoneDraft.targetDate} onChange={(event) => setMilestoneDraft((current) => ({ ...current, targetDate: event.target.value }))} aria-label="目标日期" />
            <button className="text-button" type="submit" disabled={busy === "addProjectMilestone"}><Plus size={15} aria-hidden /> 添加</button>
          </form>
        </section>

        <section className="delivery-section">
          <div className="delivery-section-heading"><span><AlertTriangle size={16} aria-hidden /><h3>项目风险</h3></span><small>{openRisks.length ? "需要决定" : "当前干净"}</small></div>
          <div className="delivery-list">
            {risks.map((risk) => (
              <div className={`delivery-risk risk-${risk.severity}`} key={risk.id}>
                <div className="delivery-risk-top"><strong>{risk.title}</strong><span className="badge">{riskSeverityLabel[risk.severity]}风险</span></div>
                <p>{risk.mitigation || "未设置缓解方案"}</p>
                <div className="delivery-risk-actions"><select aria-label={`${risk.title} 状态`} value={risk.status} onChange={(event) => void updateRisk(risk, event.target.value as ProjectRisk["status"])} disabled={busy === "updateProjectRisk"}>{Object.entries(riskStatusLabel).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><span>{riskStatusLabel[risk.status]}</span><button className="icon-button danger-icon" type="button" aria-label={`删除${risk.title}`} onClick={() => void run({ type: "deleteProjectRisk", payload: { id: risk.id } }, "风险已删除。")}><Trash2 size={14} aria-hidden /></button></div>
              </div>
            ))}
            {!risks.length ? <p className="empty-state">没有记录风险。项目遇到阻塞时，在这里留下原因和处理方案。</p> : null}
          </div>
          <form className="delivery-add-form delivery-risk-form" onSubmit={addRisk}>
            <input value={riskDraft.title} onChange={(event) => setRiskDraft((current) => ({ ...current, title: event.target.value }))} placeholder="新增风险" maxLength={200} required />
            <select value={riskDraft.severity} onChange={(event) => setRiskDraft((current) => ({ ...current, severity: event.target.value as ProjectRisk["severity"] }))} aria-label="风险等级"><option value="low">低风险</option><option value="medium">中风险</option><option value="high">高风险</option></select>
            <input value={riskDraft.mitigation} onChange={(event) => setRiskDraft((current) => ({ ...current, mitigation: event.target.value }))} placeholder="缓解方案" maxLength={4000} />
            <button className="text-button" type="submit" disabled={busy === "addProjectRisk"}><Plus size={15} aria-hidden /> 记录</button>
          </form>
        </section>
      </div>

      <div className="delivery-grid delivery-evidence-grid">
        <section className="delivery-section">
          <div className="delivery-section-heading"><span><FileCode2 size={16} aria-hidden /><h3>Agent 执行证据</h3></span><small>进度不只看百分比</small></div>
          <div className="delivery-evidence-list">
            {workItems.map((item) => {
              const agent = getAgent(item.agentId);
              return <article className="delivery-evidence" key={item.id}><header><strong>{item.title}</strong><span className={`badge ${item.status === "blocked" ? "warning" : item.status === "completed" ? "success" : "active"}`}>{item.progress}% · {item.status}</span></header><p>{item.blockedReason || item.result || "等待 Agent 提交执行结果。"}</p><footer><span>心跳 {item.lastHeartbeatAt || "暂无"}</span><span>{agent?.name || item.agentId} · 失败 {item.failureCount} 次</span></footer>{item.testResult ? <small className="evidence-line">测试：{item.testResult}</small> : null}{item.changedFiles?.length ? <small className="evidence-line">变更：{item.changedFiles.slice(0, 4).join("、")}</small> : null}{item.artifactUrl ? <a className="evidence-link" href={item.artifactUrl} target="_blank" rel="noreferrer">打开产物</a> : null}</article>;
            })}
            {!workItems.length ? <p className="empty-state">还没有 Agent 工作项。</p> : null}
          </div>
        </section>

        <section className="delivery-section">
          <div className="delivery-section-heading"><span><History size={16} aria-hidden /><h3>执行历史</h3></span><small>最近 8 条</small></div>
          <div className="delivery-timeline">
            {events.map((event) => <div className="delivery-event" key={event.id}><span className={`delivery-event-dot event-${event.eventType}`} /><div><strong>{event.eventType}</strong><p>{event.message}</p><small>{event.createdAt} · {event.progress}%</small></div></div>)}
            {!events.length ? <p className="empty-state">Agent 开始工作后，领取、进度、阻塞和完成事件会显示在这里。</p> : null}
          </div>
        </section>
      </div>
    </section>
  );
}
