"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useState } from "react";
import { calculateGoalProgress } from "@/features/life/calculations";
import { useMyOSData } from "@/lib/data/store";
import type { Goal, Priority, PrivacyLevel } from "@/lib/data/models";

export default function GoalsPage() {
  const { data, addGoal } = useMyOSData();
  const [title, setTitle] = useState("");
  const [lifeAreaId, setLifeAreaId] = useState(data.lifeAreas[0]?.id || "");
  const [priority] = useState<Priority>("medium");
  const [progressMode, setProgressMode] = useState<Goal["progressMode"]>("tasks");
  const [privacyLevel] = useState<PrivacyLevel>("normal");

  return (
    <>
      <div className="page-header">
        <div>
          <h1>目标系统</h1>
          <p>目标连接人生领域、项目、任务和习惯；进度可按任务或习惯真实计算。</p>
        </div>
      </div>
      <form className="form-inline" onSubmit={(event) => {
        event.preventDefault();
        if (!title.trim()) return;
        addGoal({
          lifeAreaId,
          title,
          description: "待补充目标说明",
          motivation: "待补充动机",
          successCriteria: "待补充成功标准",
          priority,
          targetDate: "",
          nextAction: "定义下一步行动",
          progressMode,
          privacyLevel
        });
        setTitle("");
      }}>
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="目标标题" required />
        <select value={lifeAreaId} onChange={(event) => setLifeAreaId(event.target.value)}>{data.lifeAreas.map((area) => <option value={area.id} key={area.id}>{area.name}</option>)}</select>
        <select value={progressMode} onChange={(event) => setProgressMode(event.target.value as Goal["progressMode"])}><option value="tasks">任务完成率</option><option value="habits">习惯完成率</option><option value="manual">手动进度</option></select>
        <button className="primary-button" type="submit"><Plus size={16} aria-hidden />新建目标</button>
      </form>
      <section className="panel">
        <table className="content-table">
          <thead><tr><th>目标</th><th>领域</th><th>状态</th><th>优先级</th><th>进度</th><th>下一步</th></tr></thead>
          <tbody>{data.goals.map((goal) => <tr key={goal.id}><td><Link href={`/app/goals/${goal.id}`}>{goal.title}</Link></td><td>{data.lifeAreas.find((area) => area.id === goal.lifeAreaId)?.name || "未分类"}</td><td><span className="badge">{goal.status}</span></td><td>{priorityLabel(goal.priority)}</td><td>{calculateGoalProgress(goal, data)}%</td><td>{goal.nextAction}</td></tr>)}</tbody>
        </table>
      </section>
    </>
  );
}

function priorityLabel(priority: Priority) {
  return priority === "high" ? "高" : priority === "medium" ? "中" : "低";
}
