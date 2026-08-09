"use client";

import Link from "next/link";
import { Play, RefreshCw, Settings } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useMyOSData } from "@/lib/data/store";

type IntegrationStatus = {
  id: string;
  name: string;
  state: "connected" | "unconfigured" | "error";
  message: string;
};

const defaultPaths: Record<string, string> = {
  "每日 AI 资讯": "webhook/myos/daily-ai-news",
  "文档自动分析": "webhook/myos/document-analysis",
  "项目周报": "webhook/myos/project-weekly-report"
};

export default function AutomationsPage() {
  const { data } = useMyOSData();
  const [paths, setPaths] = useState<Record<string, string>>(() => Object.fromEntries(data.automations.map((item) => [item.id, defaultPaths[item.name] || `webhook/myos/${item.id}`])));
  const [input, setInput] = useState("{\n  \"source\": \"MyOS\"\n}");
  const [runningId, setRunningId] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [statuses, setStatuses] = useState<IntegrationStatus[]>([]);
  const [checking, setChecking] = useState(false);
  const n8nStatus = useMemo(() => statuses.find((item) => item.id === "n8n"), [statuses]);
  const n8nReady = n8nStatus?.state === "connected";

  async function refreshStatus() {
    setChecking(true);
    setError("");
    try {
      const response = await fetch("/api/integrations/status", { cache: "no-store" });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || "读取自动化配置状态失败。");
      setStatuses(body.integrations || []);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "读取自动化配置状态失败。");
    } finally {
      setChecking(false);
    }
  }

  async function run(workflowId: string) {
    if (!n8nReady) {
      setError(n8nStatus?.message || "n8n 未配置。请先到系统设置里配置 N8N_BASE_URL 和 N8N_WEBHOOK_SECRET。");
      return;
    }
    if (!paths[workflowId]?.trim()) {
      setError("Webhook 路径不能为空。");
      return;
    }
    setRunningId(workflowId);
    setResult("");
    setError("");

    let parsedInput: Record<string, unknown>;
    try {
      parsedInput = JSON.parse(input);
    } catch {
      setRunningId("");
      setError("输入 JSON 无效。");
      return;
    }

    const response = await fetch("/api/automations/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workflowPath: paths[workflowId], input: parsedInput })
    });
    const body = await response.json().catch(() => null);
    setRunningId("");

    if (!response.ok) {
      setError(body?.error || "自动化执行失败。");
      return;
    }

    setResult(JSON.stringify(body.output ?? body, null, 2));
  }

  useEffect(() => {
    void refreshStatus();
  }, []);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>自动化中心</h1>
          <p>作为 n8n 的私人控制面板。浏览器只调用 MyOS 服务端，不直接暴露 Webhook 密钥。</p>
        </div>
        <div className="top-actions">
          <button className="text-button" type="button" onClick={refreshStatus} disabled={checking}><RefreshCw className={checking ? "spin" : ""} size={15} aria-hidden />刷新状态</button>
          <Link className="text-button" href="/app/settings"><Settings size={15} aria-hidden />配置 n8n</Link>
        </div>
      </div>
      <div className="ai-workbench">
        <section className="panel">
          <div className="panel-header">
            <h2>运行参数</h2>
            <span className={`badge ${n8nStatus?.state === "connected" ? "success" : n8nStatus?.state === "error" ? "failed" : "warning"}`}>
              {n8nStatus?.state === "connected" ? "n8n 可用" : n8nStatus?.state === "error" ? "n8n 异常" : "n8n 未配置"}
            </span>
          </div>
          <div className="tool-card-body">
            {n8nStatus?.state !== "connected" ? (
              <div className="empty-state compact">
                {n8nStatus?.message || "配置 N8N_BASE_URL 和 N8N_WEBHOOK_SECRET 后，这里才能真实运行工作流。"}
              </div>
            ) : null}
            <label className="field-label">输入 JSON<textarea className="search-input" value={input} onChange={(event) => setInput(event.target.value)} rows={8} /></label>
            {error ? <p className="form-error">{error}</p> : null}
            <pre className="tool-output">{result || "执行结果会显示在这里。未配置 n8n 时会返回真实未配置错误。"}</pre>
          </div>
        </section>
        <section className="panel">
          <div className="panel-header"><h2>工作流</h2></div>
          <div className="table-list">
            {data.automations.map((workflow) => (
              <div className="automation-run-row" key={workflow.id}>
                <div>
                  <div className="row-title">{workflow.name}</div>
                  <div className="row-subtitle">{workflow.lastRun} / {workflow.nextRun}</div>
                </div>
                <input className="search-input" value={paths[workflow.id] || ""} onChange={(event) => setPaths((current) => ({ ...current, [workflow.id]: event.target.value }))} aria-label={`${workflow.name} webhook path`} />
                <button className="text-button" type="button" disabled={runningId === workflow.id || !n8nReady || !paths[workflow.id]?.trim()} onClick={() => run(workflow.id)}><Play size={15} aria-hidden />{runningId === workflow.id ? "运行中" : n8nReady ? "运行" : "先配置"}</button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
