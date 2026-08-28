"use client";

import Link from "next/link";
import { Bot, RefreshCw, Send, Settings } from "lucide-react";
import { useEffect, useState } from "react";

type ProviderStatus = {
  id: string;
  name: string;
  status: { ok: boolean; message: string };
  models: Array<{ id: string; name: string }>;
};

export default function AIPage() {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [provider, setProvider] = useState("openai");
  const [model, setModel] = useState("gpt-4o-mini");
  const [system, setSystem] = useState("你是 MyOS 私人工作台中的高效助手，回答要清晰、可执行。");
  const [message, setMessage] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [arrivedFromDashboard, setArrivedFromDashboard] = useState(false);

  async function refreshProviders() {
    setError("");
    try {
      const response = await fetch("/api/ai/status", { cache: "no-store" });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || "读取 AI Provider 状态失败。");
      setProviders(body.providers || []);
      const firstConfigured = body.providers?.find((item: ProviderStatus) => item.status.ok);
      if (firstConfigured) {
        setProvider(firstConfigured.id);
        setModel(firstConfigured.models?.[0]?.id || "");
      }
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "读取 AI Provider 状态失败。");
    }
  }

  useEffect(() => {
    void refreshProviders();
  }, []);

  useEffect(() => {
    const prompt = new URLSearchParams(window.location.search).get("prompt")?.trim();
    if (!prompt) return;
    setMessage(prompt);
    setArrivedFromDashboard(true);
    window.history.replaceState({}, "", "/app/ai");
  }, []);

  const current = providers.find((item) => item.id === provider);

  async function runChat() {
    if (!message.trim()) return;
    if (!current?.status.ok) {
      setError(current?.status.message || "当前 AI Provider 未配置。请先到设置里配置密钥。");
      return;
    }
    setLoading(true);
    setError("");
    setOutput("");

    const response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider, model, system, message })
    });
    const body = await response.json().catch(() => null);
    setLoading(false);

    if (!response.ok) {
      setError(body?.error || "AI 调用失败。");
      return;
    }

    setOutput(body.content || "");
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>AI 工作台</h1>
          <p>统一模型入口。密钥只在服务端读取，未配置时明确显示状态。</p>
        </div>
        <div className="top-actions">
          <button className="text-button" type="button" onClick={refreshProviders}><RefreshCw size={15} aria-hidden />刷新状态</button>
          <Link className="text-button" href="/app/settings"><Settings size={15} aria-hidden />配置 AI</Link>
        </div>
      </div>
      <div className="ai-workbench">
        <section className="panel">
          <div className="panel-header"><h2>模型配置</h2><span className={`badge ${current?.status.ok ? "success" : "warning"}`}>{current?.status.ok ? "可用" : "未配置"}</span></div>
          <div className="tool-card-body">
            <label className="field-label">Provider<select className="search-input" value={provider} onChange={(event) => setProvider(event.target.value)}>{providers.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
            <label className="field-label">模型<input className="search-input" value={model} onChange={(event) => setModel(event.target.value)} placeholder={current?.models[0]?.id || "gpt-4o-mini / llama3.1"} /></label>
            <label className="field-label">系统提示词<textarea className="search-input" value={system} onChange={(event) => setSystem(event.target.value)} rows={4} /></label>
            <p className="row-subtitle" style={{ whiteSpace: "normal" }}>{current?.status.message || "正在读取状态..."}</p>
            {!current?.status.ok ? (
              <div className="empty-state compact">
                在系统设置里配置 OpenAI、OpenRouter、DeepSeek 或 Ollama 后，回到这里点击“刷新状态”即可使用。Codex CLI 和 GitHub Copilot CLI 请在能力中心作为本机 Agent 管理。
              </div>
            ) : null}
          </div>
        </section>
        <section className="panel">
          <div className="panel-header"><h2><Bot size={16} aria-hidden /> 对话</h2></div>
          <div className="tool-card-body">
            <textarea className="search-input" value={message} onChange={(event) => setMessage(event.target.value)} rows={7} placeholder="输入你要处理的问题、需求或文档摘要..." />
            {arrivedFromDashboard ? <p className="config-message">已带入首页的问题，请确认后发送。</p> : null}
            <button className="primary-button" type="button" disabled={loading || !message.trim() || !current?.status.ok} onClick={runChat}><Send size={16} aria-hidden />{loading ? "生成中" : current?.status.ok ? "发送" : "先配置 AI"}</button>
            {error ? <p className="form-error">{error}</p> : null}
            <pre className="tool-output">{output || "AI 输出会显示在这里。未配置密钥时会显示真实错误，不模拟成功。"}</pre>
          </div>
        </section>
      </div>
    </>
  );
}
