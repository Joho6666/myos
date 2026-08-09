"use client";

import { Archive, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { postMyOSAction, publishMyOSData } from "@/lib/data/client-actions";
import { useMyOSData } from "@/lib/data/store";

export default function EngineeringPage() {
  const { data, updateProject, deleteProject } = useMyOSData();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("单片机");
  const [issue, setIssue] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const engineeringProjects = data.projects.filter((project) => ["单片机", "PCB", "3D建模", "工程"].some((item) => project.category.includes(item) || project.name.includes(item)));

  async function createEngineeringItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !issue.trim()) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      let next = await postMyOSAction({
        type: "addProject",
        payload: { name, category, nextAction: issue }
      });
      next = await postMyOSAction({
        type: "addNote",
        payload: { title: `${name} 工程记录`, type: "工程记录", summary: issue }
      });
      publishMyOSData(next);
      setMessage(`${name} 已创建工程项。`);
      setName("");
      setIssue("");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "创建工程项失败。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-header"><div><h1>工程实验室</h1><p>管理单片机、PCB、BOM、焊接、调试和 3D 打印项目资料。</p></div></div>
      {message ? <p className="config-message">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      <form className="form-inline" onSubmit={createEngineeringItem}>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="工程项目，例如 STM32 循迹小车" required />
        <select value={category} onChange={(event) => setCategory(event.target.value)}><option>单片机</option><option>PCB</option><option>3D建模</option><option>工程</option></select>
        <input value={issue} onChange={(event) => setIssue(event.target.value)} placeholder="当前问题或下一步，例如 整理 PID 参数" required />
        <button className="primary-button" type="submit" disabled={saving}><Plus size={16} aria-hidden />创建工程项</button>
      </form>
      <section className="panel"><div className="panel-header"><h2>工程项目</h2></div><div className="table-list">{engineeringProjects.length ? engineeringProjects.map((project) => <div className="row" key={project.id}><span><span className="row-title">{project.name}</span><span className="row-subtitle">{project.nextAction}</span></span><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span className={`badge ${project.status}`}>{project.category}</span><button className="icon-button" type="button" aria-label="归档工程项目" onClick={() => updateProject({ ...project, status: "archived" })}><Archive size={15} aria-hidden /></button><button className="icon-button" type="button" aria-label="删除工程项目" onClick={() => window.confirm(`确定删除「${project.name}」吗？`) ? deleteProject(project.id) : undefined}><Trash2 size={15} aria-hidden /></button></span></div>) : <div className="empty-state">还没有工程项目。</div>}</div></section>
    </>
  );
}
