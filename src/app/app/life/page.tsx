"use client";

import Link from "next/link";
import { Panel, Row } from "@/components/dashboard/panel";
import { calculateGoalProgress, habitCompletionRate } from "@/features/life/calculations";
import { useMyOSData } from "@/lib/data/store";

export default function LifePage() {
  const { data } = useMyOSData();
  const activeGoals = data.goals.filter((goal) => goal.status === "active");
  const rate = habitCompletionRate(data.habits, data.habitLogs);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>人生管理</h1>
          <p>用“领域 → 目标 → 项目 → 任务”的结构管理长期方向和日常行动。</p>
        </div>
        <div className="top-actions">
          <Link className="text-button" href="/app/life/areas">领域</Link>
          <Link className="text-button" href="/app/goals">目标</Link>
          <Link className="text-button" href="/app/reviews/daily">复盘</Link>
        </div>
      </div>
      <div className="panel-grid">
        <Panel title="人生领域">
          <div className="table-list">
            {data.lifeAreas.sort((a, b) => a.displayOrder - b.displayOrder).map((area) => (
              <Row key={area.id} title={area.name} subtitle={area.description} meta={<span className={`badge ${area.status === "active" ? "active" : "warning"}`}>{area.status}</span>} />
            ))}
          </div>
        </Panel>
        <Panel title="活跃目标">
          <div className="table-list">
            {activeGoals.map((goal) => (
              <Row key={goal.id} title={goal.title} subtitle={goal.nextAction} meta={<span className="badge">{calculateGoalProgress(goal, data)}%</span>} />
            ))}
          </div>
        </Panel>
        <Panel title="今日习惯">
          <div className="table-list">
            <Row title="今日习惯完成率" subtitle="基于真实习惯日志计算，不模拟 AI 结论。" meta={<span className="badge success">{rate}%</span>} />
            {data.habits.map((habit) => <Row key={habit.id} title={habit.name} subtitle={habit.description} meta={<span className="badge">{habit.status}</span>} />)}
          </div>
        </Panel>
        <Panel title="复盘入口">
          <div className="table-list">
            <Row title="每日复盘" subtitle="四个问题，轻量记录当天状态。" meta={<Link className="panel-link" href="/app/reviews/daily">打开</Link>} />
            <Row title="每周复盘" subtitle="从任务、目标、习惯和每日记录生成规则摘要。" meta={<Link className="panel-link" href="/app/reviews/weekly">打开</Link>} />
          </div>
        </Panel>
      </div>
    </>
  );
}
