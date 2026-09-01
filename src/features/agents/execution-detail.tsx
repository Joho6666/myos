"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, RotateCcw, Square, X } from "lucide-react";
import type { AgentExecution } from "@/lib/data/models";
import { getAgent } from "@/features/agents/registry";

type LogLine = { seq: number; stream: string; text: string; createdAt: string };

export function ExecutionDetail({ id }: { id: string }) {
  const [execution, setExecution] = useState<AgentExecution | null>(null);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    let closed = false;
    void Promise.all([
      fetch(`/api/executions/${id}`, { cache: "no-store" }).then((response) => response.json()),
      fetch(`/api/executions/${id}/logs`, { cache: "no-store" }).then((response) => response.json())
    ]).then(([detail, logBody]) => {
      if (closed) return;
      if (detail.error) throw new Error(detail.error);
      setExecution(detail.execution);
      setLogs(logBody.logs || []);
    }).catch((loadError: unknown) => {
      if (!closed) setError(loadError instanceof Error ? loadError.message : "读取执行失败。");
    });
    const source = new EventSource(`/api/executions/${id}/events`);
    source.onmessage = (event) => {
      const payload = JSON.parse(event.data) as { type?: string; execution?: AgentExecution; seq?: number; stream?: string; text?: string; createdAt?: string };
      if (payload.execution) setExecution(payload.execution);
      if (payload.type === "log" && payload.text) {
        setLogs((current) => [...current, { seq: payload.seq || current.length, stream: payload.stream || "stdout", text: payload.text || "", createdAt: payload.createdAt || "" }]);
      }
    };
    source.onerror = () => source.close();
    return () => { closed = true; source.close(); };
  }, [id]);

  async function act(type: "stop" | "approve" | "accept" | "rollback", decision?: "once" | "always" | "deny") {
    setBusy(type + (decision || ""));
    setError("");
    try {
      const response = await fetch(`/api/executions/${id}/action`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type, decision })
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || "操作失败。");
      setExecution(body.execution);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "操作失败。");
    } finally {
      setBusy("");
    }
  }

  if (!execution) {
    return <div className="empty-state">{error || "正在读取执行状态…"}</div>;
  }

  const agent = getAgent(execution.agentId);
  const live = ["queued", "preparing", "running", "verifying"].includes(execution.status);

  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow"><Link href="/app/executions"><ArrowLeft size={14} aria-hidden /> 执行中心</Link></p>
          <h1>{execution.title}</h1>
          <p>{execution.projectName} · {agent?.name || execution.agentId} · {execution.workingDirectory}</p>
        </div>
        <span className={`badge ${execution.status === "completed" ? "success" : execution.status === "failed" ? "warning" : ""}`}>{execution.status}</span>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      {execution.snapshot?.dirty ? <p className="config-message">执行前工作区已有未提交改动。Rollback 只会尝试还原本次 Agent 新增改动。</p> : null}

      {execution.status === "waiting_for_approval" ? (
        <section className="panel">
          <div className="panel-header"><h2>需要批准</h2></div>
          <p>{execution.approval?.reason} {(execution.approval?.risks || []).join("、")}</p>
          <div className="agent-inline-form">
            <button className="primary-button" type="button" disabled={Boolean(busy)} onClick={() => void act("approve", "once")}>允许一次</button>
            <button className="text-button" type="button" disabled={Boolean(busy)} onClick={() => void act("approve", "always")}>始终允许</button>
            <button className="text-button" type="button" disabled={Boolean(busy)} onClick={() => void act("approve", "deny")}><X size={15} aria-hidden />拒绝</button>
          </div>
        </section>
      ) : null}

      <section className="agent-control-metrics" aria-label="执行结果">
        <div><span>权限<strong>{execution.permissionProfile}</strong></span></div>
        <div><span>文件<strong>{execution.diff?.filesChanged ?? 0}</strong></span></div>
        <div><span>新增<strong>+{execution.diff?.additions ?? 0}</strong></span></div>
        <div><span>删除<strong>-{execution.diff?.deletions ?? 0}</strong></span></div>
      </section>

      <div className="agent-work-grid">
        <section className="panel">
          <div className="panel-header"><h2>实时日志</h2>{live ? <button className="text-button" type="button" onClick={() => void act("stop")} disabled={Boolean(busy)}><Square size={14} aria-hidden />取消</button> : null}</div>
          <pre className="execution-log" aria-live="polite">{logs.map((line) => `[${line.stream}] ${line.text}`).join("\n") || execution.latestAction || "尚无日志。"}</pre>
        </section>
        <section className="panel">
          <div className="panel-header"><h2>验证</h2></div>
          <div className="table-list">
            {execution.verification.map((item) => (
              <div className="row" key={item.name}><span className="row-title">{item.name}</span><span className={`badge ${item.ok ? "success" : "warning"}`}>{item.ok ? "✅" : "❌"}</span></div>
            ))}
            {!execution.verification.length ? <div className="empty-state compact">尚未运行验证。</div> : null}
          </div>
          {execution.diff?.patch ? <pre className="execution-log">{execution.diff.patch.slice(0, 12000)}</pre> : null}
        </section>
      </div>

      {execution.status === "completed" ? (
        <div className="agent-inline-form">
          <button className="primary-button" type="button" disabled={Boolean(busy)} onClick={() => void act("accept")}><Check size={15} aria-hidden />验收</button>
          <button className="text-button" type="button" disabled={Boolean(busy)} onClick={() => void act("rollback")}><RotateCcw size={15} aria-hidden />回滚本次改动</button>
          <Link className="text-button" href={`/app/projects/${execution.projectId}`}>打开项目</Link>
        </div>
      ) : null}
      {execution.status === "failed" ? (
        <p className="form-error">{execution.error || `退出码 ${execution.exitCode ?? "-"}`}</p>
      ) : null}
    </>
  );
}
