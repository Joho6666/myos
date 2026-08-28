"use client";

import Link from "next/link";
import { ArrowRight, Bot, Check, CheckCircle2, Clock3, FolderKanban, Inbox, Plus, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { agentRegistry } from "@/features/agents/registry";
import { getTodayFocus, getTodayTasks } from "@/features/life/calculations";
import type { AgentWorkItem } from "@/lib/data/models";
import { useMyOSData } from "@/lib/data/store";

function projectProgress(projectId: string, manualProgress: number, workItems: AgentWorkItem[]) {
  const items = workItems.filter((item) => item.projectId === projectId);
  return items.length ? Math.round(items.reduce((total, item) => total + item.progress, 0) / items.length) : manualProgress;
}

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "早上好" : hour < 18 ? "下午好" : "晚上好";
}

export function DashboardClient() {
  const { data, toggleTask } = useMyOSData();
  const date = useMemo(() => new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" }), []);
  const focusTasks = getTodayFocus(data.tasks);
  const todayTasks = getTodayTasks(data.tasks);
  const pendingInbox = data.inbox.filter((item) => item.status === "pending");
  const projects = data.projects.filter((project) => !["done", "archived"].includes(project.status)).slice(0, 4);
  const agentWork = data.agentWorkItems.filter((item) => item.status !== "completed").slice(0, 3);
  const doneCount = todayTasks.filter((task) => task.done).length;

  return <div className="live-dashboard">
    <section className="live-intro" aria-labelledby="today-heading"><div><p>{date}</p><h1 id="today-heading">{greeting()}，JOHO。</h1><span>先把最重要的一件事推进下去。</span></div><Link className="live-primary-action" href="/app/inbox"><Plus size={17} aria-hidden />快速记录</Link></section>
    <section className="live-focus" aria-labelledby="focus-heading">
      <Heading kicker="今日重点" title="要推进的事" href="/app/tasks" label="查看全部" id="focus-heading" />
      <div className="live-task-list">{focusTasks.slice(0, 4).map((task, index) => <button className={task.done ? "live-task done" : "live-task"} type="button" key={task.id} onClick={() => void toggleTask(task.id)}><span className="live-task-check">{task.done ? <Check size={15} aria-hidden /> : null}</span><span className="live-task-copy"><strong>{task.title}</strong><small>{task.project || "未归属项目"}</small></span><span className="live-task-meta"><em>{index === 0 ? "焦点" : task.priority || "待处理"}</em><time>{task.due || "今天"}</time></span></button>)}{!focusTasks.length ? <Empty href="/app/tasks" icon={<CheckCircle2 size={18} aria-hidden />} text="今天还没有重点任务，去挑选一件要推进的事。" /> : null}</div>
    </section>
    <div className="live-grid">
      <section className="live-pane" aria-labelledby="projects-heading"><Heading kicker="项目" title="正在推进" href="/app/projects" label="项目中心" id="projects-heading" /><div className="live-project-list">{projects.map((project) => { const progress = projectProgress(project.id, project.manualProgress ?? 0, data.agentWorkItems); return <Link className="live-project-row" href={`/app/projects/${project.id}`} key={project.id}><span className="live-project-icon"><FolderKanban size={18} aria-hidden /></span><span className="live-project-copy"><strong>{project.name}</strong><small>下一步：{project.nextAction || "整理下一步"}</small><i><b style={{ width: `${progress}%` }} /></i></span><b className="live-progress">{progress}%</b></Link>; })}{!projects.length ? <Empty href="/app/projects" icon={<Plus size={18} aria-hidden />} text="建立一个项目，让 MyOS 先为你整理上下文。" /> : null}</div></section>
      <section className="live-pane" aria-labelledby="inbox-heading"><Heading kicker="收件箱" title="等待整理" href="/app/inbox" label="打开收件箱" id="inbox-heading" /><div className="live-inbox-list">{pendingInbox.slice(0, 4).map((item) => <Link className="live-inbox-row" href="/app/inbox" key={item.id}><span><Inbox size={16} aria-hidden /></span><div><strong>{item.title}</strong><small>{item.type} · {item.category}</small></div></Link>)}{!pendingInbox.length ? <Empty href="/app/inbox" icon={<Inbox size={18} aria-hidden />} text="收件箱已清空，想到什么就先放进来。" /> : null}</div></section>
    </div>
    <section className="live-agents" aria-labelledby="agents-heading"><Heading kicker="Agent" title="协作队列" href="/app/agents" label="控制中心" id="agents-heading" /><div className="live-agent-list">{agentWork.map((item) => { const agent = agentRegistry.find((entry) => entry.id === item.agentId); return <Link className="live-agent-row" href={`/app/projects/${item.projectId}`} key={item.id}><span><Bot size={18} aria-hidden /></span><div><strong>{item.title}</strong><small>{agent?.name || "Agent"} · {item.status === "blocked" ? "等待你的决定" : "正在推进"}</small></div><b>{item.progress}%</b></Link>; })}{!agentWork.length ? <Empty href="/app/agents" icon={<Sparkles size={18} aria-hidden />} text="暂时没有运行中的 Agent 工作项。" /> : null}</div><footer><Clock3 size={15} aria-hidden />今日完成 {doneCount}/{todayTasks.length} 项任务</footer></section>
  </div>;
}

function Heading({ kicker, title, href, label, id }: { kicker: string; title: string; href: string; label: string; id: string }) {
  return <div className="live-section-heading"><div><p>{kicker}</p><h2 id={id}>{title}</h2></div><Link href={href}>{label}<ArrowRight size={15} aria-hidden /></Link></div>;
}

function Empty({ href, icon, text }: { href: string; icon: React.ReactNode; text: string }) {
  return <Link className="live-empty" href={href}>{icon}{text}</Link>;
}
