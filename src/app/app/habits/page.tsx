"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { useMyOSData } from "@/lib/data/store";
import type { Habit, PrivacyLevel } from "@/lib/data/models";

export default function HabitsPage() {
  const { data, addHabit, logHabit } = useMyOSData();
  const [name, setName] = useState("");
  const [lifeAreaId, setLifeAreaId] = useState(data.lifeAreas[0]?.id || "");
  const [goalId, setGoalId] = useState("");
  const [frequencyType, setFrequencyType] = useState<Habit["frequencyType"]>("daily");
  const [privacyLevel, setPrivacyLevel] = useState<PrivacyLevel>("normal");

  return (
    <>
      <div className="page-header">
        <div>
          <h1>习惯</h1>
          <p>轻量记录习惯完成、部分完成、跳过和补记；不做断签惩罚。</p>
        </div>
      </div>
      <form className="form-inline" onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim()) return;
        addHabit({ name, description: "待补充说明", lifeAreaId, goalId: goalId || undefined, frequencyType, targetValue: 1, unit: "次", reminderTime: "", privacyLevel });
        setName("");
      }}>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="习惯名称" required />
        <select value={lifeAreaId} onChange={(event) => setLifeAreaId(event.target.value)}>{data.lifeAreas.map((area) => <option value={area.id} key={area.id}>{area.name}</option>)}</select>
        <select value={goalId} onChange={(event) => setGoalId(event.target.value)}><option value="">不关联目标</option>{data.goals.map((goal) => <option value={goal.id} key={goal.id}>{goal.title}</option>)}</select>
        <button className="primary-button" type="submit"><Plus size={16} aria-hidden />新建习惯</button>
      </form>
      <div className="panel-grid">
        {data.habits.map((habit) => {
          const todayLog = data.habitLogs.find((log) => log.habitId === habit.id && log.logDate === "today");
          return (
            <section className="panel" key={habit.id}>
              <div className="panel-header"><h2>{habit.name}</h2><span className="badge">{todayLog?.status || "未记录"}</span></div>
              <div style={{ padding: 14, display: "grid", gap: 10 }}>
                <p className="row-subtitle" style={{ whiteSpace: "normal" }}>{habit.description}</p>
                <div className="top-actions">
                  <button className="text-button" type="button" onClick={() => logHabit(habit.id, "completed", habit.targetValue)}>完成</button>
                  <button className="text-button" type="button" onClick={() => logHabit(habit.id, "partial", 0.5)}>部分</button>
                  <button className="text-button" type="button" onClick={() => logHabit(habit.id, "skipped", 0, "主动跳过")}>跳过</button>
                </div>
              </div>
            </section>
          );
        })}
      </div>
      <div style={{ display: "none" }}>
        <select value={frequencyType} onChange={(event) => setFrequencyType(event.target.value as Habit["frequencyType"])} />
        <select value={privacyLevel} onChange={(event) => setPrivacyLevel(event.target.value as PrivacyLevel)} />
      </div>
    </>
  );
}
