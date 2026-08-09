"use client";

import { Archive, CheckSquare, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { postMyOSAction, publishMyOSData } from "@/lib/data/client-actions";
import { useMyOSData } from "@/lib/data/store";

const businessTypes = ["Word/PPT/Excel", "课程报告", "网站开发", "微信小程序", "AI自动化", "单片机/PCB", "数据分析"];

export default function BusinessPage() {
  const { data, updateProject, deleteProject } = useMyOSData();
  const [client, setClient] = useState("");
  const [type, setType] = useState("课程报告");
  const [requirement, setRequirement] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const businessProjects = data.projects.filter((project) => project.category === "接单项目");

  async function createBusinessOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client.trim() || !requirement.trim()) return;
    const projectName = `${client} - ${type}`;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      let next = await postMyOSAction({
        type: "addProject",
        payload: { name: projectName, category: "接单项目", nextAction: requirement }
      });
      next = await postMyOSAction({
        type: "addTask",
        payload: { title: `确认 ${projectName} 需求和截止时间`, priority: "high", project: projectName, due: "今天", plannedDate: "today", todayFocus: false }
      });
      next = await postMyOSAction({
        type: "addInbox",
        payload: { title: requirement, type: "text", category: "客户需求" }
      });
      publishMyOSData(next);
      setClient("");
      setRequirement("");
      setMessage(`${projectName} 已创建业务单。`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "创建业务单失败。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-header"><div><h1>业务中心</h1><p>记录接单需求、报价、成本、交付和复盘。不创建客户登录入口。</p></div></div>
      {message ? <p className="config-message">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      <form className="form-inline" onSubmit={createBusinessOrder}>
        <input value={client} onChange={(event) => setClient(event.target.value)} placeholder="客户或来源，例如 同学A" required />
        <select value={type} onChange={(event) => setType(event.target.value)}>{businessTypes.map((item) => <option key={item}>{item}</option>)}</select>
        <input value={requirement} onChange={(event) => setRequirement(event.target.value)} placeholder="需求摘要、报价或截止时间" required />
        <button className="primary-button" type="submit" disabled={saving}><Plus size={16} aria-hidden />创建业务单</button>
      </form>
      <section className="panel"><div className="panel-header"><h2>业务项目</h2></div><div className="table-list">{businessProjects.length ? businessProjects.map((project) => <div className="row" key={project.id}><span><span className="row-title">{project.name}</span><span className="row-subtitle">{project.nextAction}</span></span><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span className={`badge ${project.status}`}>{project.updatedAt}</span><button className="icon-button" type="button" aria-label="完成业务项目" onClick={() => updateProject({ ...project, status: "done" })}><CheckSquare size={15} aria-hidden /></button><button className="icon-button" type="button" aria-label="归档业务项目" onClick={() => updateProject({ ...project, status: "archived" })}><Archive size={15} aria-hidden /></button><button className="icon-button" type="button" aria-label="删除业务项目" onClick={() => window.confirm(`确定删除「${project.name}」吗？`) ? deleteProject(project.id) : undefined}><Trash2 size={15} aria-hidden /></button></span></div>) : <div className="empty-state">还没有业务项目。</div>}</div></section>
    </>
  );
}
