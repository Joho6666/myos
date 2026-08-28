"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, CheckCircle2, Clock3, FolderKanban, Inbox, Plus, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { getNextTasks, getTodayFocus, getTodayTasks } from "@/features/life/calculations";
import type { Task } from "@/lib/data/models";
import { useMyOSData } from "@/lib/data/store";
import { useCreationCenter } from "@/features/creation/creation-context";

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "早上好" : hour < 18 ? "下午好" : "晚上好";
}

function priorityLabel(priority: Task["priority"]) {
  return priority === "high" ? "高优先" : priority === "medium" ? "中优先" : "低优先";
}

export function DashboardClient() {
  const { data, toggleTask } = useMyOSData();
  const { openCreation } = useCreationCenter();
  const router = useRouter();
  const [aiQuestion, setAiQuestion] = useState("");
  const date = useMemo(() => new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" }), []);
  const focusTasks = getTodayFocus(data.tasks);
  const nextTasks = getNextTasks(data.tasks);
  const todayTasks = getTodayTasks(data.tasks);
  const pendingInbox = data.inbox.filter((item) => item.status === "pending");
  const projects = data.projects.filter((project) => !["done", "archived"].includes(project.status)).slice(0, 4);
  const doneCount = todayTasks.filter((task) => task.done).length;
  const progress = todayTasks.length ? Math.round((doneCount / todayTasks.length) * 100) : 0;
  const priorityStats = (["high", "medium", "low"] as const).map((priority) => ({
    priority,
    count: data.tasks.filter((task) => !task.done && task.priority === priority && !["cancelled", "archived", "completed"].includes(task.status || "planned")).length
  }));
  const maxPriorityCount = Math.max(1, ...priorityStats.map((item) => item.count));
  const ringLength = 226;

  function sendToAI() {
    const prompt = aiQuestion.trim();
    if (!prompt) return;
    router.push(`/app/ai?prompt=${encodeURIComponent(prompt)}`);
  }

  return <div className="live-dashboard">
    <section className="live-intro" aria-labelledby="today-heading">
      <div><p>{date}</p><h1 id="today-heading">{greeting()}，JOHO。</h1><span>先把最重要的一件事推进下去。</span></div>
      <button className="live-primary-action" type="button" onClick={(event) => openCreation({ type: "inbox", trigger: event.currentTarget })}><Plus size={17} aria-hidden />快速记录</button>
    </section>

    <section className="live-focus" aria-labelledby="focus-heading">
      <Heading kicker="今日重点" title="要推进的事" href="/app/tasks" label="查看全部" id="focus-heading" />
      <div className="live-focus-layout">
        <div className="live-task-list">
          {focusTasks.map((task, index) => <TaskRow key={task.id} task={task} index={index} onToggle={toggleTask} />)}
          {!focusTasks.length ? <Empty href="/app/tasks" icon={<CheckCircle2 size={18} aria-hidden />} text="今天还没有重点任务，去挑选一件要推进的事。" /> : null}
        </div>
        <section className="live-visual-summary" aria-label="今日任务进度">
          <div className="live-progress-ring" role="img" aria-label={`今日已完成 ${doneCount} 项，共 ${todayTasks.length} 项，完成率 ${progress}%`}>
            <svg viewBox="0 0 84 84" aria-hidden>
              <circle className="live-ring-track" cx="42" cy="42" r="36" />
              <circle className="live-ring-value" cx="42" cy="42" r="36" strokeDasharray={ringLength} strokeDashoffset={ringLength - ringLength * progress / 100} />
            </svg>
            <span><strong>{progress}%</strong><small>今日进度</small></span>
          </div>
          <div className="live-priority-chart" aria-label="未完成任务优先级分布">
            <strong>任务分布</strong>
            {priorityStats.map((item) => <div key={item.priority}><span>{priorityLabel(item.priority)}</span><i><b style={{ width: `${item.count / maxPriorityCount * 100}%` }} /></i><em>{item.count}</em></div>)}
          </div>
        </section>
      </div>
    </section>

    <section className="live-next" aria-labelledby="next-heading">
      <Heading kicker="下一步" title="接下来可处理" href="/app/tasks" label="任务中心" id="next-heading" />
      <div className="live-task-list">
        {nextTasks.map((task) => <TaskRow key={task.id} task={task} onToggle={toggleTask} />)}
        {!nextTasks.length ? <Empty href="/app/tasks" icon={<Plus size={18} aria-hidden />} text="下一步已经很清楚了，或者新建一个任务。" /> : null}
      </div>
    </section>

    <div className="live-grid">
      <section className="live-pane" aria-labelledby="projects-heading">
        <Heading kicker="项目" title="正在推进" href="/app/projects" label="项目中心" id="projects-heading" />
        <div className="live-project-list">
          {projects.map((project) => <Link className="live-project-row" href={`/app/projects/${project.id}`} key={project.id}><span className="live-project-icon"><FolderKanban size={18} aria-hidden /></span><span className="live-project-copy"><strong>{project.name}</strong><small>下一步：{project.nextAction || "整理下一步"}</small><i><b style={{ width: `${project.manualProgress ?? 0}%` }} /></i></span><b className="live-progress">{project.manualProgress ?? 0}%</b></Link>)}
          {!projects.length ? <Empty href="/app/projects" icon={<Plus size={18} aria-hidden />} text="建立一个项目，让 MyOS 先为你整理上下文。" /> : null}
        </div>
      </section>
      <section className="live-pane" aria-labelledby="inbox-heading">
        <Heading kicker="收件箱" title="等待整理" href="/app/inbox" label="打开收件箱" id="inbox-heading" />
        <div className="live-inbox-list">
          {pendingInbox.slice(0, 3).map((item) => <Link className="live-inbox-row" href="/app/inbox" key={item.id}><span><Inbox size={16} aria-hidden /></span><div><strong>{item.title}</strong><small>{item.type} · {item.category}</small></div></Link>)}
          {!pendingInbox.length ? <Empty href="/app/inbox" icon={<Inbox size={18} aria-hidden />} text="收件箱已清空，想到什么就先放进来。" /> : null}
        </div>
      </section>
    </div>

    <form className="live-ai-entry" onSubmit={(event) => { event.preventDefault(); sendToAI(); }}>
      <Sparkles size={18} aria-hidden />
      <label className="sr-only" htmlFor="dashboard-ai-question">向 AI 提问</label>
      <input id="dashboard-ai-question" value={aiQuestion} onChange={(event) => setAiQuestion(event.target.value)} placeholder="问问 AI，整理思路或开始处理…" />
      <button type="submit" disabled={!aiQuestion.trim()}>进入 AI 工作台<ArrowRight size={16} aria-hidden /></button>
    </form>
    <footer className="live-dashboard-footer"><Clock3 size={15} aria-hidden />今日完成 {doneCount}/{todayTasks.length} 项任务</footer>
  </div>;
}

function TaskRow({ task, index, onToggle }: { task: Task; index?: number; onToggle: (id: string) => Promise<boolean> }) {
  return <button className={task.done ? "live-task done" : "live-task"} type="button" onClick={() => void onToggle(task.id)}><span className="live-task-check">{task.done ? <Check size={15} aria-hidden /> : null}</span><span className="live-task-copy"><strong>{task.title}</strong><small>{task.project || "未归属项目"}</small></span><span className="live-task-meta"><em>{index === 0 && task.todayFocus ? "焦点" : priorityLabel(task.priority)}</em><time>{task.plannedDate || task.due || "待安排"}</time></span></button>;
}

function Heading({ kicker, title, href, label, id }: { kicker: string; title: string; href: string; label: string; id: string }) {
  return <div className="live-section-heading"><div><p>{kicker}</p><h2 id={id}>{title}</h2></div><Link href={href}>{label}<ArrowRight size={15} aria-hidden /></Link></div>;
}

function Empty({ href, icon, text }: { href: string; icon: React.ReactNode; text: string }) {
  return <Link className="live-empty" href={href}>{icon}{text}</Link>;
}
