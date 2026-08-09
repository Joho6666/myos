"use client";

import Link from "next/link";
import { AlertTriangle, Bot, CheckCircle2, ChevronRight, FolderKanban, GitBranch, ListTodo } from "lucide-react";
import { getAgent } from "@/features/agents/registry";
import { useMyOSData } from "@/lib/data/store";

const stateLabels = {
  completed: "已完成",
  in_progress: "进行中",
  queued: "待领取",
  blocked: "已阻塞"
} as const;

export function WorkMap() {
  const { data } = useMyOSData();
  const agentItems = data.agentWorkItems;
  const stateCounts = {
    completed: agentItems.filter((item) => item.status === "completed").length,
    in_progress: agentItems.filter((item) => item.status === "in_progress").length,
    queued: agentItems.filter((item) => item.status === "queued").length,
    blocked: agentItems.filter((item) => item.status === "blocked").length
  };
  const totalWork = agentItems.length;
  const completionRate = totalWork ? Math.round((stateCounts.completed / totalWork) * 100) : 0;
  const activeProjects = data.projects.filter((project) => project.status !== "done" && project.status !== "archived");
  const visibleProjects = activeProjects.slice(0, 6);
  const maxProjectLoad = Math.max(1, ...visibleProjects.map((project) => data.tasks.filter((task) => task.project === project.name && !task.done).length + agentItems.filter((item) => item.projectId === project.id && item.status !== "completed").length));
  const portfolioStages = [
    { label: "活跃项目", value: activeProjects.length },
    { label: "已拆任务", value: activeProjects.filter((project) => data.tasks.some((task) => task.project === project.name)).length },
    { label: "已分配 Agent", value: activeProjects.filter((project) => data.agentAssignments.some((assignment) => assignment.projectId === project.id)).length },
    { label: "已有汇报", value: activeProjects.filter((project) => data.agentReports.some((report) => report.projectId === project.id)).length }
  ];
  const categoryCounts = Object.entries(data.projects.reduce<Record<string, number>>((counts, project) => {
    counts[project.category] = (counts[project.category] || 0) + 1;
    return counts;
  }, {})).sort(([, a], [, b]) => b - a).slice(0, 6);
  const maxCategoryCount = Math.max(1, ...categoryCounts.map(([, count]) => count));

  return (
    <>
      <div className="page-header work-map-header">
        <div>
          <p className="eyebrow"><GitBranch size={14} aria-hidden /> 可视化工作地图</p>
          <h1>工作树与执行看板</h1>
          <p>从项目分支进入任务和 Agent 工作项。图表仅统计已保存的真实记录。</p>
        </div>
        <Link className="text-button" href="/app/projects"><FolderKanban size={16} aria-hidden />管理项目</Link>
      </div>

      <section className="work-map-summary" aria-label="执行概览">
        <div className="work-completion-ring" style={{ background: `conic-gradient(hsl(var(--accent)) ${completionRate}%, hsl(var(--border)) 0)` }} aria-label={`Agent 工作完成率 ${completionRate}%`}><div><strong>{completionRate}%</strong><span>完成率</span></div></div>
        <div className="work-summary-copy"><strong>当前执行节奏</strong><p>{totalWork ? `${totalWork} 个 Agent 工作项中，${stateCounts.in_progress} 个正在推进。` : "还没有 Agent 工作项。先在项目详情中创建一个可执行工作项。"}</p></div>
        <div className="work-summary-stats"><span>活跃项目<strong>{activeProjects.length}</strong></span><span>未完成任务<strong>{data.tasks.filter((task) => !task.done).length}</strong></span><span>阻塞项<strong>{stateCounts.blocked}</strong></span></div>
      </section>

      <div className="work-map-layout">
        <section className="panel">
          <div className="panel-header"><h2>工作树</h2><span className="row-subtitle">点击节点进入项目处理</span></div>
          <div className="work-tree">
            {visibleProjects.map((project) => {
              const tasks = data.tasks.filter((task) => task.project === project.name).slice(0, 3);
              const work = agentItems.filter((item) => item.projectId === project.id).slice(0, 3);
              const childCount = tasks.length + work.length;
              return <details className="work-tree-project" key={project.id} open={visibleProjects.length <= 3}>
                <summary><span className="work-tree-node root"><FolderKanban size={16} aria-hidden /><span><strong>{project.name}</strong><small>{project.category} · {childCount} 项关联工作</small></span></span><ChevronRight size={16} aria-hidden /></summary>
                <div className="work-tree-branches">
                  {tasks.map((task) => <Link href="/app/tasks" className="work-tree-node task" key={task.id}><ListTodo size={15} aria-hidden /><span><strong>{task.title}</strong><small>{task.done ? "已完成" : `任务 · ${task.due}`}</small></span></Link>)}
                  {work.map((item) => <Link href={`/app/projects/${project.id}`} className={`work-tree-node agent ${item.status}`} key={item.id}><Bot size={15} aria-hidden /><span><strong>{item.title}</strong><small>{getAgent(item.agentId)?.name || item.agentId} · {stateLabels[item.status]} · {item.progress}%</small></span></Link>)}
                  {!childCount ? <Link href={`/app/projects/${project.id}`} className="work-tree-empty">创建任务或分配 Agent，工作分支会出现在这里。</Link> : null}
                </div>
              </details>;
            })}
            {!visibleProjects.length ? <div className="empty-state">没有进行中的项目。先用项目模板建立一个工作分支。</div> : null}
          </div>
        </section>

        <aside className="work-map-side">
          <section className="panel">
            <div className="panel-header"><h2>Agent 执行分布</h2><Link className="panel-link" href="/app/agents">控制中心</Link></div>
            <div className="execution-bars">
              {(Object.keys(stateCounts) as Array<keyof typeof stateCounts>).map((state) => {
                const value = stateCounts[state];
                const width = totalWork ? Math.round((value / totalWork) * 100) : 0;
                return <div className="execution-bar" key={state}><div><span>{stateLabels[state]}</span><strong>{value}</strong></div><div className="execution-track"><span className={state} style={{ width: `${width}%` }} /></div></div>;
              })}
              {!totalWork ? <div className="empty-state compact">没有 Agent 工作项，因此没有可统计的执行状态。</div> : null}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header"><h2>项目负载</h2><span className="row-subtitle">未完成项目工作</span></div>
            <div className="project-load-bars">
              {visibleProjects.map((project) => {
                const tasks = data.tasks.filter((task) => task.project === project.name && !task.done).length;
                const work = agentItems.filter((item) => item.projectId === project.id && item.status !== "completed").length;
                const load = tasks + work;
                return <Link href={`/app/projects/${project.id}`} className="project-load" key={project.id}><div><strong>{project.name}</strong><span>{load} 项待推进</span></div><div className="project-load-track"><span style={{ width: `${Math.round((load / maxProjectLoad) * 100)}%` }} /></div></Link>;
              })}
              {!visibleProjects.length ? <div className="empty-state compact">项目启动后会显示负载情况。</div> : null}
            </div>
          </section>
        </aside>
      </div>

      <section className="work-map-alerts panel">
        <div className="panel-header"><h2>需要注意</h2></div>
        <div className="table-list">
          {agentItems.filter((item) => item.status === "blocked").map((item) => {
            const project = data.projects.find((entry) => entry.id === item.projectId);
            return <Link className="row-link" href={`/app/projects/${item.projectId}`} key={item.id}><div className="row"><span><span className="row-title">{item.title}</span><span className="row-subtitle">{project?.name || "未知项目"} · {getAgent(item.agentId)?.name || item.agentId}</span></span><span className="badge warning"><AlertTriangle size={13} aria-hidden />阻塞</span></div></Link>;
          })}
          {!stateCounts.blocked ? <div className="row work-map-clear"><CheckCircle2 size={17} aria-hidden /><span>目前没有标记为阻塞的 Agent 工作项。</span></div> : null}
        </div>
      </section>

      <div className="portfolio-insights">
        <section className="panel">
          <div className="panel-header"><h2>项目推进漏斗</h2><span className="row-subtitle">从创建到 Agent 汇报</span></div>
          <div className="portfolio-funnel">
            {portfolioStages.map((stage, index) => <div className="portfolio-funnel-stage" key={stage.label} style={{ width: `${Math.max(42, 100 - index * 14)}%` }}><span>{stage.label}</span><strong>{stage.value}</strong></div>)}
          </div>
          <p className="portfolio-insight-note">如果“已拆任务”或“已分配 Agent”的数量明显变小，说明项目还没有进入可执行状态。</p>
        </section>

        <section className="panel">
          <div className="panel-header"><h2>项目类型分布</h2><Link className="panel-link" href="/app/projects">管理分类</Link></div>
          <div className="category-bars">
            {categoryCounts.map(([category, count]) => <div className="category-bar" key={category}><div><span>{category}</span><strong>{count}</strong></div><div><span style={{ width: `${Math.round((count / maxCategoryCount) * 100)}%` }} /></div></div>)}
            {!categoryCounts.length ? <div className="empty-state compact">创建项目后会显示类型分布。</div> : null}
          </div>
        </section>
      </div>
    </>
  );
}
