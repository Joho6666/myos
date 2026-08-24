"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { postMyOSAction, publishMyOSData } from "@/lib/data/client-actions";
import { useMyOSData } from "@/lib/data/store";
import type { Priority, Task } from "@/lib/data/models";

const recurrenceOptions: { value: NonNullable<Task["recurrenceRule"]> | ""; label: string }[] = [
  { value: "", label: "不重复" },
  { value: "daily", label: "每天" },
  { value: "weekdays", label: "工作日" },
  { value: "weekly", label: "每周" },
  { value: "monthly", label: "每月" }
];

function recurrenceLabel(value?: string) {
  return recurrenceOptions.find((option) => option.value === value)?.label ?? "不重复";
}

function toDateInput(value?: string) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date();
  if (value === "tomorrow") date.setDate(date.getDate() + 1);
  return new Intl.DateTimeFormat("en-CA").format(date);
}

export default function TasksPage() {
  const { data } = useMyOSData();
  const [title, setTitle] = useState("");
  const [project, setProject] = useState("");
  const [goalId, setGoalId] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [todayFocus, setTodayFocus] = useState(false);
  const [recurrence, setRecurrence] = useState<NonNullable<Task["recurrenceRule"]> | "">("");
  const [editingId, setEditingId] = useState("");
  const [draft, setDraft] = useState({ title: "", project: "", goalId: "", priority: "medium" as Priority, due: "今天", plannedDate: "today", todayFocus: false, status: "planned" as Task["status"], recurrence: "" as NonNullable<Task["recurrenceRule"]> | "" });
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const focusCount = data.tasks.filter((task) => task.todayFocus && !task.done).length;

  function startEdit(task: Task) {
    setEditingId(task.id);
    setDraft({
      title: task.title,
      project: task.project || "",
      goalId: task.goalId || "",
      priority: task.priority,
      due: task.due,
      plannedDate: toDateInput(task.plannedDate),
      todayFocus: Boolean(task.todayFocus),
      status: task.status || "planned",
      recurrence: (task.recurrenceRule as NonNullable<Task["recurrenceRule"]>) || ""
    });
  }

  async function createTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    setBusy("create");
    setMessage("");
    setError("");
    try {
      const next = await postMyOSAction({
        type: "addTask",
        payload: { title, priority, project: project || undefined, goalId: goalId || undefined, due: "今天", plannedDate: "today", todayFocus, recurrenceRule: recurrence || undefined }
      });
      publishMyOSData(next);
      setTitle("");
      setMessage(`${title} 已创建。`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "新建任务失败。");
    } finally {
      setBusy("");
    }
  }

  async function saveEdit(task: Task) {
    if (!draft.title.trim()) return;
    setBusy(task.id);
    setMessage("");
    setError("");
    try {
      const next = await postMyOSAction({
        type: "updateTask",
        payload: {
          id: task.id,
          title: draft.title,
          project: draft.project || undefined,
          goalId: draft.goalId || undefined,
          priority: draft.priority,
          due: draft.due || "今天",
          plannedDate: draft.plannedDate || undefined,
          todayFocus: draft.todayFocus,
          status: draft.status,
          recurrenceRule: draft.recurrence || undefined
        }
      });
      publishMyOSData(next);
      setEditingId("");
      setMessage(`${draft.title} 已更新。`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "更新任务失败。");
    } finally {
      setBusy("");
    }
  }

  async function toggleTaskDone(task: Task) {
    setBusy(task.id);
    setMessage("");
    setError("");
    try {
      const next = await postMyOSAction({
        type: "toggleTask",
        payload: { id: task.id }
      });
      publishMyOSData(next);
      const spawned = !task.done && task.recurrenceRule && next.tasks.some((item) => item.title === task.title && !item.done && item.id !== task.id);
      setMessage(task.done ? `${task.title} 已标记为未完成。` : spawned ? `${task.title} 已完成，下一轮已生成。` : `${task.title} 已完成。`);
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "切换任务状态失败。");
    } finally {
      setBusy("");
    }
  }

  async function removeTask(task: Task) {
    if (!window.confirm(`确定删除「${task.title}」吗？`)) return;
    setBusy(task.id);
    setMessage("");
    setError("");
    try {
      const next = await postMyOSAction({
        type: "deleteTask",
        payload: { id: task.id }
      });
      publishMyOSData(next);
      setMessage(`${task.title} 已删除。`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除任务失败。");
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>任务</h1>
          <p>任务可以关联项目、直接关联目标，也可以作为普通生活任务。今日重点建议最多突出 3 项。</p>
        </div>
      </div>
      {message ? <p className="config-message">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      {focusCount >= 3 ? <div className="panel" style={{ padding: 14, marginBottom: 14, color: "hsl(var(--muted))" }}>今日重点已突出 3 项。仍可继续创建任务，但新任务不会自动成为重点。</div> : null}
      <form className="form-inline" onSubmit={createTask}>
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="任务标题" required />
        <select value={project} onChange={(event) => setProject(event.target.value)}><option value="">不关联项目</option>{data.projects.map((item) => <option value={item.name} key={item.id}>{item.name}</option>)}</select>
        <select value={goalId} onChange={(event) => setGoalId(event.target.value)}><option value="">不关联目标</option>{data.goals.map((goal) => <option value={goal.id} key={goal.id}>{goal.title}</option>)}</select>
        <button className="primary-button" type="submit" disabled={busy === "create"}><Plus size={16} aria-hidden />{busy === "create" ? "创建中" : "新建任务"}</button>
      </form>
      <div className="form-inline">
        <select value={priority} onChange={(event) => setPriority(event.target.value as Priority)}><option value="high">高优先级</option><option value="medium">中优先级</option><option value="low">低优先级</option></select>
        <select aria-label="重复规则" value={recurrence} onChange={(event) => setRecurrence(event.target.value as NonNullable<Task["recurrenceRule"]> | "")}>{recurrenceOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select>
        <label className="text-button"><input type="checkbox" checked={todayFocus} onChange={(event) => setTodayFocus(event.target.checked)} /> 标记今日重点</label>
      </div>
      <section className="panel">
        <table className="content-table">
          <thead><tr><th>完成</th><th>任务</th><th>项目</th><th>目标</th><th>计划</th><th>重复</th><th>重点</th><th>优先级</th><th>操作</th></tr></thead>
          <tbody>{data.tasks.map((task) => (
            <tr key={task.id}>
              <td><input type="checkbox" checked={task.done} disabled={busy === task.id} onChange={() => toggleTaskDone(task)} /></td>
              {editingId === task.id ? (
                <>
                  <td><input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} /></td>
                  <td><select value={draft.project} onChange={(event) => setDraft((current) => ({ ...current, project: event.target.value }))}><option value="">生活任务</option>{data.projects.map((item) => <option value={item.name} key={item.id}>{item.name}</option>)}</select></td>
                  <td><select value={draft.goalId} onChange={(event) => setDraft((current) => ({ ...current, goalId: event.target.value }))}><option value="">未关联</option>{data.goals.map((goal) => <option value={goal.id} key={goal.id}>{goal.title}</option>)}</select></td>
                  <td>
                    <div className="task-plan-editor">
                      <input aria-label="计划日期" type="date" value={draft.plannedDate} onChange={(event) => setDraft((current) => ({ ...current, plannedDate: event.target.value }))} />
                      <input aria-label="截止提示" value={draft.due} onChange={(event) => setDraft((current) => ({ ...current, due: event.target.value }))} />
                    </div>
                  </td>
                  <td><select aria-label="重复规则" value={draft.recurrence} onChange={(event) => setDraft((current) => ({ ...current, recurrence: event.target.value as NonNullable<Task["recurrenceRule"]> | "" }))}>{recurrenceOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></td>
                  <td><input type="checkbox" checked={draft.todayFocus} onChange={(event) => setDraft((current) => ({ ...current, todayFocus: event.target.checked }))} /></td>
                  <td><select value={draft.priority} onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value as Priority }))}><option value="high">high</option><option value="medium">medium</option><option value="low">low</option></select></td>
                  <td><span style={{ display: "inline-flex", gap: 8 }}><button className="text-button" type="button" disabled={busy === task.id} onClick={() => saveEdit(task)}>{busy === task.id ? "保存中" : "保存"}</button><button className="text-button" type="button" onClick={() => setEditingId("")}>取消</button></span></td>
                </>
              ) : (
                <>
                  <td>{task.title}</td>
                  <td>{task.project || "生活任务"}</td>
                  <td>{data.goals.find((goal) => goal.id === task.goalId)?.title || "未关联"}</td>
                  <td>{task.plannedDate || task.due}</td>
                  <td>{recurrenceLabel(task.recurrenceRule)}</td>
                  <td>{task.todayFocus ? "是" : "否"}</td>
                  <td>{task.priority}</td>
                  <td>
                    <span style={{ display: "inline-flex", gap: 8 }}>
                      <button className="icon-button" type="button" aria-label="编辑任务" onClick={() => startEdit(task)}><Pencil size={15} aria-hidden /></button>
                      <button className="icon-button" type="button" aria-label="删除任务" disabled={busy === task.id} onClick={() => removeTask(task)}><Trash2 size={15} aria-hidden /></button>
                    </span>
                  </td>
                </>
              )}
            </tr>
          ))}</tbody>
        </table>
      </section>
    </>
  );
}
