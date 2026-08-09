"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { calculateGoalProgress } from "@/features/life/calculations";
import { useMyOSData } from "@/lib/data/store";

export default function GoalDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, updateGoalProgress } = useMyOSData();
  const goal = data.goals.find((item) => item.id === params.id);

  if (!goal) {
    return <section className="panel"><div className="empty-state">目标不存在。<Link href="/app/goals">返回目标系统</Link></div></section>;
  }

  const area = data.lifeAreas.find((item) => item.id === goal.lifeAreaId);
  const projects = data.projects.filter((project) => project.goalId === goal.id || data.tasks.some((task) => task.goalId === goal.id && task.project === project.name));
  const tasks = data.tasks.filter((task) => task.goalId === goal.id);
  const habits = data.habits.filter((habit) => habit.goalId === goal.id);
  const progress = calculateGoalProgress(goal, data);

  return (
    <>
      <div className="page-header">
        <div><h1>{goal.title}</h1><p>{area?.name || "未分类"} / {goal.status} / {goal.priority}</p></div>
        <span className="badge success">{progress}%</span>
      </div>
      <div className="panel-grid">
        <section className="panel"><div className="panel-header"><h2>目标说明</h2></div><div className="table-list"><div className="row"><span>说明</span><strong>{goal.description}</strong></div><div className="row"><span>为什么要完成</span><strong>{goal.motivation}</strong></div><div className="row"><span>成功标准</span><strong>{goal.successCriteria}</strong></div><div className="row"><span>下一步行动</span><strong>{goal.nextAction}</strong></div></div></section>
        <section className="panel"><div className="panel-header"><h2>进度来源</h2></div><div style={{ padding: 14, display: "grid", gap: 10 }}><select className="search-input" value={goal.progressMode} onChange={(event) => updateGoalProgress(goal.id, goal.manualProgress, event.target.value as typeof goal.progressMode)}><option value="manual">手动进度</option><option value="tasks">关联任务完成率</option><option value="habits">关联习惯完成情况</option></select><input className="search-input" type="number" min={0} max={100} value={goal.manualProgress} onChange={(event) => updateGoalProgress(goal.id, Number(event.target.value), goal.progressMode)} /><p className="row-subtitle" style={{ whiteSpace: "normal" }}>当前计算结果：{progress}%。里程碑进度结构已在数据库层预留为后续扩展。</p></div></section>
        <section className="panel"><div className="panel-header"><h2>关联项目</h2></div><div className="table-list">{projects.length ? projects.map((project) => <div className="row" key={project.id}><span>{project.name}</span><span className="badge">{project.status}</span></div>) : <div className="empty-state">暂无关联项目</div>}</div></section>
        <section className="panel"><div className="panel-header"><h2>关联任务</h2></div><div className="table-list">{tasks.length ? tasks.map((task) => <div className="row" key={task.id}><span>{task.title}</span><span className="badge">{task.done ? "完成" : task.priority}</span></div>) : <div className="empty-state">暂无关联任务</div>}</div></section>
        <section className="panel"><div className="panel-header"><h2>关联习惯</h2></div><div className="table-list">{habits.length ? habits.map((habit) => <div className="row" key={habit.id}><span>{habit.name}</span><span className="badge">{habit.status}</span></div>) : <div className="empty-state">暂无关联习惯</div>}</div></section>
        <section className="panel"><div className="panel-header"><h2>相关复盘</h2></div><div className="table-list">{data.dailyReviews.map((review) => <div className="row" key={review.id}><span>{review.date}</span><span className="badge">每日</span></div>)}</div></section>
      </div>
    </>
  );
}
