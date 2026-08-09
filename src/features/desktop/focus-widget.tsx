"use client";

import { Check, Circle, ExternalLink, ListTodo, Minus, X } from "lucide-react";
import { useMemo } from "react";
import { useMyOSData } from "@/lib/data/store";

export function FocusWidget() {
  const { data, ready, saving, toggleTask } = useMyOSData();
  const tasks = useMemo(() => data.tasks.filter((task) => !task.done && task.status !== "completed" && task.status !== "archived").slice(0, 4), [data.tasks]);
  const projects = useMemo(() => data.projects.filter((project) => project.status === "active").slice(0, 2), [data.projects]);

  function hideFocus() {
    void window.myosDesktop?.toggleFocusWindow();
  }

  function openMain() {
    void window.myosDesktop?.showMainWindow();
    hideFocus();
  }

  return <main className="focus-widget">
    <header className="focus-widget-header">
      <span><Circle size={11} fill="currentColor" aria-hidden /> MyOS</span>
      <div><button type="button" onClick={hideFocus} title="隐藏浮窗" aria-label="隐藏浮窗"><Minus size={16} aria-hidden /></button><button type="button" onClick={hideFocus} title="隐藏浮窗" aria-label="隐藏浮窗"><X size={16} aria-hidden /></button></div>
    </header>
    <section className="focus-widget-intro"><p>现在专注</p><h1>今天推进什么？</h1><span>{ready ? `还有 ${tasks.length} 件待完成事项` : "正在同步任务"}</span></section>
    <section className="focus-widget-section" aria-label="待完成任务">
      <div className="focus-widget-heading"><ListTodo size={15} aria-hidden /><strong>下一步</strong></div>
      <div className="focus-task-list">
        {tasks.map((task) => <button type="button" className="focus-task" key={task.id} disabled={saving} onClick={() => void toggleTask(task.id)}><Check size={15} aria-hidden /><span><strong>{task.title}</strong><small>{task.project || task.due || "未安排项目"}</small></span></button>)}
        {ready && !tasks.length ? <p className="focus-empty">今天没有待办，适合整理收件箱或开始一个项目。</p> : null}
      </div>
    </section>
    <section className="focus-widget-section" aria-label="进行中项目">
      <div className="focus-widget-heading"><Circle size={13} fill="currentColor" aria-hidden /><strong>进行中项目</strong></div>
      <div className="focus-project-list">{projects.map((project) => <div key={project.id}><span><strong>{project.name}</strong><small>{project.nextAction}</small></span><span className="focus-project-progress">{project.manualProgress ?? 0}%</span></div>)}{ready && !projects.length ? <p className="focus-empty">还没有进行中的项目。</p> : null}</div>
    </section>
    <button className="focus-open-main" type="button" onClick={openMain}><ExternalLink size={15} aria-hidden />打开完整 MyOS</button>
  </main>;
}
