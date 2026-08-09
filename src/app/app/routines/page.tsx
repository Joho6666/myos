"use client";

import { useState } from "react";
import { useMyOSData } from "@/lib/data/store";

export default function RoutinesPage() {
  const { data, logRoutine } = useMyOSData();
  const [checked, setChecked] = useState<Record<string, string[]>>({});

  return (
    <>
      <div className="page-header">
        <div>
          <h1>例程</h1>
          <p>例程由多个可排序步骤组成，可以完成、跳过或补记。当前先实现步骤完成记录。</p>
        </div>
      </div>
      <div className="panel-grid">
        {data.routines.map((routine) => {
          const steps = data.routineSteps.filter((step) => step.routineId === routine.id).sort((a, b) => a.displayOrder - b.displayOrder);
          const completed = checked[routine.id] || [];
          return (
            <section className="panel" key={routine.id}>
              <div className="panel-header"><h2>{routine.name}</h2><span className="badge">{routine.scheduleType}</span></div>
              <div className="table-list">
                {steps.map((step) => (
                  <label className="row" key={step.id}>
                    <span className="task-cell"><input type="checkbox" checked={completed.includes(step.id)} onChange={(event) => setChecked((current) => ({ ...current, [routine.id]: event.target.checked ? [...completed, step.id] : completed.filter((id) => id !== step.id) }))} /><span><span className="row-title">{step.displayOrder}. {step.title}</span><span className="row-subtitle">{step.estimatedMinutes || 0} 分钟</span></span></span>
                    <span className="badge">步骤</span>
                  </label>
                ))}
              </div>
              <div style={{ padding: 14 }} className="top-actions">
                <button className="text-button" type="button" onClick={() => logRoutine(routine.id, completed, completed.length === steps.length ? "completed" : "partial")}>保存记录</button>
                <button className="text-button" type="button" onClick={() => logRoutine(routine.id, [], "skipped")}>跳过</button>
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
