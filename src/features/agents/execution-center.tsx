"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, CircleDashed, Play, Timer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getAgent } from "@/features/agents/registry";
import type { AgentExecution } from "@/lib/data/models";

function bucket(status: AgentExecution["status"]) {
  if (status === "waiting_for_approval") return "waiting";
  if (status === "completed") return "completed";
  if (status === "failed" || status === "cancelled") return "failed";
  return "running";
}

export function ExecutionCenter() {
  const [executions, setExecutions] = useState<AgentExecution[]>([]);
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/executions", { cache: "no-store" });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || "无法读取执行记录。");
      setExecutions(body.executions || []);
      setWarning(body.warning || "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "无法读取执行记录。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  const groups = useMemo(() => ({
    running: executions.filter((item) => bucket(item.status) === "running"),
    waiting: executions.filter((item) => bucket(item.status) === "waiting"),
    completed: executions.filter((item) => bucket(item.status) === "completed"),
    failed: executions.filter((item) => bucket(item.status) === "failed")
  }), [executions]);

  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow"><Play size={14} aria-hidden /> Execution</p>
          <h1>执行中心</h1>
          <p>查看正在运行、等待审批、已完成和失败的 Agent 任务。状态来自 Python Agent Runtime，不是模拟进度。</p>
        </div>
        <Link className="text-button" href="/app/agents">去派发</Link>
      </div>
      {warning ? <p className="config-message">{warning}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      <section className="agent-control-metrics" aria-label="执行概览">
        <div><CircleDashed size={18} aria-hidden /><span>运行中<strong>{groups.running.length}</strong></span></div>
        <div><Timer size={18} aria-hidden /><span>待审批<strong>{groups.waiting.length}</strong></span></div>
        <div><CheckCircle2 size={18} aria-hidden /><span>已完成<strong>{groups.completed.length}</strong></span></div>
        <div><AlertTriangle size={18} aria-hidden /><span>失败<strong>{groups.failed.length}</strong></span></div>
      </section>
      {(["waiting", "running", "completed", "failed"] as const).map((key) => (
        <section className="panel" key={key}>
          <div className="panel-header"><h2>{{ waiting: "等待审批", running: "运行中", completed: "已完成", failed: "失败" }[key]}</h2></div>
          <div className="table-list">
            {groups[key].map((item) => {
              const agent = getAgent(item.agentId);
              return (
                <Link className="row-link" href={`/app/executions/${item.id}`} key={item.id}>
                  <div className="row">
                    <span>
                      <span className="row-title">{item.title}</span>
                      <span className="row-subtitle">{item.projectName} · {agent?.name || item.agentId} · {item.phase}</span>
                    </span>
                    <span className={`badge ${key === "failed" ? "warning" : key === "completed" ? "success" : ""}`}>{item.status}</span>
                  </div>
                </Link>
              );
            })}
            {!groups[key].length && !loading ? <div className="empty-state compact">暂无记录。</div> : null}
          </div>
        </section>
      ))}
    </>
  );
}
