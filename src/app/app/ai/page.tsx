"use client";

import Link from "next/link";
import { ArrowUpRight, Bot, ChevronDown, Copy, MessageSquarePlus, RefreshCw, Send, Settings, Sparkles, Trash2, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type ProviderStatus = {
  id: string;
  name: string;
  status: { ok: boolean; message: string };
  models: Array<{ id: string; name: string }>;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const suggestions = ["帮我整理今天的优先事项", "把这段内容总结成行动清单", "帮我分析一个技术问题"];

function renderMessage(content: string) {
  return content.split(/```/).map((part, index) => index % 2 === 1
    ? <pre className="ai-code-block" key={`${index}-${part.slice(0, 12)}`}>{part.replace(/^\w+\n/, "")}</pre>
    : <div className="ai-rich-text" key={`${index}-${part.slice(0, 12)}`}>{part}</div>);
}

export default function AIPage() {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [provider, setProvider] = useState("openai");
  const [model, setModel] = useState("gpt-4o-mini");
  const [system, setSystem] = useState("你是 MyOS 私人工作台中的高效助手，回答要清晰、可执行。\n优先给出结论、步骤和可直接执行的下一步。");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [arrivedFromDashboard, setArrivedFromDashboard] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);

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
      const message = refreshError instanceof Error ? refreshError.message : "读取 AI Provider 状态失败。";
      setError(message === "fetch failed" ? "暂时无法读取 AI 状态，请稍后重试。" : message);
    }
  }

  useEffect(() => { void refreshProviders(); }, []);

  useEffect(() => {
    const prompt = new URLSearchParams(window.location.search).get("prompt")?.trim();
    if (!prompt) return;
    setMessage(prompt);
    setArrivedFromDashboard(true);
    window.history.replaceState({}, "", "/app/ai");
    window.setTimeout(() => composerRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    const container = conversationRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages, loading]);

  const current = providers.find((item) => item.id === provider);
  const canSend = Boolean(message.trim()) && Boolean(current?.status.ok) && !loading;

  function handleProviderChange(nextProvider: string) {
    setProvider(nextProvider);
    const next = providers.find((item) => item.id === nextProvider);
    if (next?.models?.[0]?.id) setModel(next.models[0].id);
  }

  function providerMessage() {
    const statusMessage = current?.status.message || "正在读取状态...";
    return statusMessage === "fetch failed" ? "无法连接 Ollama，请确认服务已启动。" : statusMessage;
  }

  async function runChat() {
    const prompt = message.trim();
    if (!prompt || loading) return;
    if (!current?.status.ok) {
      setError(current?.status.message || "当前 AI Provider 未配置。请先到设置里配置密钥。");
      return;
    }

    const userMessage: ChatMessage = { id: `${Date.now()}-user`, role: "user", content: prompt };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setMessage("");
    setError("");
    setArrivedFromDashboard(false);
    setLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider, model, system, messages: nextMessages.map(({ role, content }) => ({ role, content })) })
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || "AI 调用失败。");
      setMessages((currentMessages) => [...currentMessages, { id: `${Date.now()}-assistant`, role: "assistant", content: body.content || "AI 没有返回内容。" }]);
    } catch (chatError) {
      setError(chatError instanceof Error ? chatError.message : "AI 调用失败。");
      setMessage(prompt);
    } finally {
      setLoading(false);
    }
  }

  function handleComposerKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void runChat();
    }
  }

  function clearConversation() {
    if (loading) return;
    setMessages([]);
    setError("");
    setMessage("");
    composerRef.current?.focus();
  }

  async function copyMessage(content: string) {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      setError("复制失败，请手动选择文本复制。");
    }
  }

  return (
    <div className="ai-page">
      <div className="page-header ai-page-header">
        <div><h1>AI 工作台</h1><p>像和一个真正的助手对话一样，连续追问、整理和执行。</p></div>
        <div className="top-actions"><button className="text-button" type="button" onClick={refreshProviders}><RefreshCw size={15} aria-hidden />刷新状态</button><Link className="text-button" href="/app/settings"><Settings size={15} aria-hidden />配置 AI</Link></div>
      </div>

      <div className="ai-workbench">
        <aside className="panel ai-settings-panel" aria-label="模型设置">
          <div className="panel-header"><h2><Sparkles size={16} aria-hidden />模型</h2><span className={`badge ${current?.status.ok ? "success" : "warning"}`}>{current?.status.ok ? "可用" : "未配置"}</span></div>
          <div className="tool-card-body">
            <label className="field-label">Provider<select className="search-input" value={provider} onChange={(event) => handleProviderChange(event.target.value)}>{providers.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
            <label className="field-label">模型<input className="search-input" value={model} onChange={(event) => setModel(event.target.value)} placeholder={current?.models[0]?.id || "gpt-4o-mini / llama3.1"} /></label>
            <details className="ai-advanced-settings">
              <summary>高级设置<ChevronDown size={15} aria-hidden /></summary>
              <label className="field-label">系统提示词<textarea className="search-input" value={system} onChange={(event) => setSystem(event.target.value)} rows={5} /></label>
            </details>
            <p className="row-subtitle ai-provider-status">{providerMessage()}</p>
            {!current?.status.ok ? <div className="empty-state compact">在设置里配置 OpenAI、OpenRouter、DeepSeek 或 Ollama 后即可开始对话。</div> : null}
          </div>
        </aside>

        <section className="panel ai-chat-panel" aria-label="AI 对话">
          <header className="ai-chat-header"><div><h2><Bot size={17} aria-hidden /> MyOS AI</h2><span>{current?.name || "选择一个 Provider"} · {model || "等待模型"}</span></div><div className="ai-chat-actions"><button className="icon-button" type="button" aria-label="新建对话" onClick={clearConversation} disabled={loading}><MessageSquarePlus size={16} aria-hidden /></button><button className="icon-button" type="button" aria-label="清空对话" onClick={clearConversation} disabled={!messages.length || loading}><Trash2 size={16} aria-hidden /></button></div></header>
          <div className="ai-conversation" ref={conversationRef} role="log" aria-live="polite">
            {!messages.length && !loading ? <div className="ai-welcome"><div className="ai-welcome-icon"><Sparkles size={22} aria-hidden /></div><h3>今天想一起完成什么？</h3><p>你可以直接提问、粘贴内容，或者让 AI 帮你拆解下一步。</p><div className="ai-suggestions">{suggestions.map((item) => <button type="button" key={item} onClick={() => { setMessage(item); composerRef.current?.focus(); }}>{item}<ArrowIcon /></button>)}</div></div> : null}
            {messages.map((item) => <article className={`ai-message ${item.role}`} key={item.id}><div className="ai-message-avatar">{item.role === "user" ? <UserRound size={15} aria-hidden /> : <Bot size={15} aria-hidden />}</div><div className="ai-message-body"><div className="ai-message-meta"><strong>{item.role === "user" ? "你" : "MyOS AI"}</strong></div><div className="ai-message-content">{renderMessage(item.content)}</div>{item.role === "assistant" ? <div className="ai-message-tools"><button type="button" onClick={() => void copyMessage(item.content)}><Copy size={13} aria-hidden />复制</button></div> : null}</div></article>)}
            {loading ? <article className="ai-message assistant"><div className="ai-message-avatar"><Bot size={15} aria-hidden /></div><div className="ai-message-body"><div className="ai-message-meta"><strong>MyOS AI</strong></div><div className="ai-thinking"><span /><span /><span />正在思考…</div></div></article> : null}
          </div>
          <form className="ai-composer" onSubmit={(event) => { event.preventDefault(); void runChat(); }}><div className="ai-composer-box"><textarea ref={composerRef} value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={handleComposerKeyDown} rows={1} aria-label="输入消息" placeholder="给 MyOS AI 发消息…" /><button className="ai-send-button" type="submit" aria-label={loading ? "生成中" : "发送消息"} disabled={!canSend}>{loading ? <span className="ai-stop-square" /> : <Send size={17} aria-hidden />}</button></div><div className="ai-composer-hint">Enter 发送 · Shift + Enter 换行 · AI 可能会犯错，请核对重要信息</div></form>
          {arrivedFromDashboard ? <p className="config-message ai-import-notice">已带入首页的问题，请确认后发送。</p> : null}
          {error ? <p className="form-error ai-error">{error}</p> : null}
        </section>
      </div>
    </div>
  );
}

function ArrowIcon() {
  return <ArrowUpRight size={14} aria-hidden />;
}
