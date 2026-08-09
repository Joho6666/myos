"use client";

import { CheckSquare, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { postMyOSAction, publishMyOSData } from "@/lib/data/client-actions";
import { useMyOSData } from "@/lib/data/store";

const tracks = ["C语言", "51单片机", "STM32", "嘉立创EDA", "PCB", "SolidWorks", "Next.js", "Python", "AI Agent", "n8n", "MCP", "概率论"];

export default function LearningPage() {
  const { data, toggleTask, deleteTask, deleteNote } = useMyOSData();
  const [track, setTrack] = useState("STM32");
  const [nextAction, setNextAction] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const learningTasks = data.tasks.filter((task) => tracks.some((item) => task.title.includes(item) || task.project?.includes(item)));
  const learningNotes = data.notes.filter((note) => note.type.includes("学习") || tracks.some((item) => note.title.includes(item)));

  async function createLearningPlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nextAction.trim()) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      let next = await postMyOSAction({
        type: "addTask",
        payload: { title: `${track}：${nextAction}`, priority: "medium", project: track, due: "今天", plannedDate: "today", todayFocus: false }
      });
      next = await postMyOSAction({
        type: "addNote",
        payload: { title: `${track} 学习记录`, type: "学习总结", summary: nextAction }
      });
      publishMyOSData(next);
      setNextAction("");
      setMessage(`${track} 学习计划已添加。`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "添加学习计划失败。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-header"><div><h1>学习中心</h1><p>把学习方向变成今天能执行的任务和可复用笔记。</p></div></div>
      {message ? <p className="config-message">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      <form className="form-inline" onSubmit={createLearningPlan}>
        <select value={track} onChange={(event) => setTrack(event.target.value)}>{tracks.map((item) => <option key={item}>{item}</option>)}</select>
        <input value={nextAction} onChange={(event) => setNextAction(event.target.value)} placeholder="下一步学习内容，例如 看完定时器章节并做笔记" required />
        <button className="primary-button" type="submit" disabled={saving}><Plus size={16} aria-hidden />加入学习计划</button>
      </form>
      <div className="panel-grid">
        <section className="panel"><div className="panel-header"><h2>学习任务</h2></div><div className="table-list">{learningTasks.length ? learningTasks.map((task) => <div className="row" key={task.id}><span>{task.title}</span><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span className={`badge ${task.priority}`}>{task.done ? "完成" : task.due}</span><button className="icon-button" type="button" aria-label="切换完成" onClick={() => toggleTask(task.id)}><CheckSquare size={15} aria-hidden /></button><button className="icon-button" type="button" aria-label="删除学习任务" onClick={() => window.confirm(`确定删除「${task.title}」吗？`) ? deleteTask(task.id) : undefined}><Trash2 size={15} aria-hidden /></button></span></div>) : <div className="empty-state">还没有学习任务。</div>}</div></section>
        <section className="panel"><div className="panel-header"><h2>学习笔记</h2></div><div className="table-list">{learningNotes.length ? learningNotes.map((note) => <div className="row" key={note.id}><span><span className="row-title">{note.title}</span><span className="row-subtitle">{note.summary}</span></span><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span className="badge">{note.type}</span><button className="icon-button" type="button" aria-label="删除学习笔记" onClick={() => window.confirm(`确定删除「${note.title}」吗？`) ? deleteNote(note.id) : undefined}><Trash2 size={15} aria-hidden /></button></span></div>) : <div className="empty-state">还没有学习笔记。</div>}</div></section>
      </div>
    </>
  );
}
