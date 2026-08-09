"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Copy, RefreshCw, Save, Settings, Trash2, Wrench } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { toolsRegistry } from "@/features/tools/registry";

type IntegrationStatus = {
  id: string;
  name: string;
  category: string;
  state: "connected" | "unconfigured" | "error";
  message: string;
  detail?: string;
};

type ConfigFieldView = {
  key: string;
  label: string;
  group: "owner" | "database" | "ai" | "automation" | "external";
  secret: boolean;
  description: string;
  placeholder?: string;
  configured: boolean;
  value: string;
  maskedValue: string;
};

const groupLabels = {
  owner: "基础",
  database: "数据库",
  ai: "AI",
  automation: "自动化",
  external: "外部工具"
};

function extractVariables(input: string) {
  const matches = input.match(/{{\s*[\w\u4e00-\u9fa5-]+\s*}}/g) || [];
  return Array.from(new Set(matches.map((item) => item.replace(/[{}]/g, "").trim())));
}

function formatJson(input: string, mode: "pretty" | "minify") {
  const parsed = JSON.parse(input);
  return mode === "pretty" ? JSON.stringify(parsed, null, 2) : JSON.stringify(parsed);
}

function encodeBase64(input: string) {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function decodeBase64(input: string) {
  const binary = atob(input.trim());
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function renderInline(text: string) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) return <code key={`${part}-${index}`}>{part.slice(1, -1)}</code>;
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function renderMarkdownPreview(input: string): ReactNode[] {
  const lines = input.split(/\r?\n/);
  const nodes: ReactNode[] = [];
  let listItems: string[] = [];

  function flushList() {
    if (!listItems.length) return;
    nodes.push(
      <ul key={`list-${nodes.length}`}>
        {listItems.map((item, index) => <li key={`${item}-${index}`}>{renderInline(item)}</li>)}
      </ul>
    );
    listItems = [];
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    const bullet = trimmed.match(/^[-*]\s+(.+)$/);

    if (bullet) {
      listItems.push(bullet[1]);
      return;
    }

    flushList();

    if (!trimmed) {
      nodes.push(<div className="markdown-gap" key={`gap-${index}`} />);
      return;
    }
    if (heading?.[1].length === 1) {
      nodes.push(<h1 key={`h1-${index}`}>{renderInline(heading[2])}</h1>);
      return;
    }
    if (heading?.[1].length === 2) {
      nodes.push(<h2 key={`h2-${index}`}>{renderInline(heading[2])}</h2>);
      return;
    }
    if (heading?.[1].length === 3) {
      nodes.push(<h3 key={`h3-${index}`}>{renderInline(heading[2])}</h3>);
      return;
    }
    nodes.push(<p key={`p-${index}`}>{renderInline(trimmed)}</p>);
  });

  flushList();
  return nodes;
}

function calculateTimer(clockMHz: number, prescaler: number, periodMs: number) {
  const invalid = (error: string) => ({ arr: 0, timerHz: 0, actualMs: 0, overflow16: false, error });
  if (!Number.isFinite(clockMHz) || clockMHz <= 0) return invalid("时钟频率必须大于 0。");
  if (!Number.isInteger(prescaler) || prescaler < 0) return invalid("预分频 PSC 必须是大于等于 0 的整数。");
  if (!Number.isFinite(periodMs) || periodMs <= 0) return invalid("目标周期必须大于 0。");
  const timerHz = (clockMHz * 1_000_000) / (prescaler + 1);
  const arr = Math.round(timerHz * (periodMs / 1000) - 1);
  if (arr < 0) return invalid("当前参数下 ARR 小于 0，请增加目标周期或降低预分频。");
  const actualMs = ((arr + 1) / timerHz) * 1000;
  const overflow16 = arr > 65535;
  return {
    arr,
    timerHz,
    actualMs,
    overflow16,
    error: ""
  };
}

export default function ToolsPage() {
  const [configFields, setConfigFields] = useState<ConfigFieldView[]>([]);
  const [configDraft, setConfigDraft] = useState<Record<string, string>>({});
  const [configSaving, setConfigSaving] = useState("");
  const [configMessage, setConfigMessage] = useState("");
  const [configError, setConfigError] = useState("");
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [integrationLoading, setIntegrationLoading] = useState(false);
  const [integrationError, setIntegrationError] = useState("");
  const [jsonInput, setJsonInput] = useState("{\"name\":\"MyOS\",\"ok\":true}");
  const [jsonOutput, setJsonOutput] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [textInput, setTextInput] = useState("MyOS 私人工具站");
  const [base64Output, setBase64Output] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [markdown, setMarkdown] = useState("# MyOS\n\n- 今日任务\n- 项目中心");
  const [prompt, setPrompt] = useState("请基于 {{project_name}} 输出 {{output_format}}。");
  const [clockMHz, setClockMHz] = useState(72);
  const [prescaler, setPrescaler] = useState(7199);
  const [periodMs, setPeriodMs] = useState(10);
  const variables = useMemo(() => extractVariables(prompt), [prompt]);
  const markdownPreview = useMemo(() => renderMarkdownPreview(markdown), [markdown]);
  const timerResult = useMemo(() => calculateTimer(clockMHz, prescaler, periodMs), [clockMHz, periodMs, prescaler]);
  const connectedCount = integrations.filter((item) => item.state === "connected").length;
  const unconfiguredCount = integrations.filter((item) => item.state === "unconfigured").length;
  const errorCount = integrations.filter((item) => item.state === "error").length;
  const toolReadiness = integrations.length ? Math.round((connectedCount / integrations.length) * 100) : 0;
  const groupedConfig = useMemo(() => {
    return configFields.reduce<Record<string, ConfigFieldView[]>>((acc, field) => {
      acc[field.group] = [...(acc[field.group] || []), field];
      return acc;
    }, {});
  }, [configFields]);

  async function copyText(value: string) {
    if (!value) return;
    await navigator.clipboard?.writeText(value);
    setCopyMessage("已复制");
    window.setTimeout(() => setCopyMessage(""), 1200);
  }

  async function refreshIntegrations() {
    setIntegrationLoading(true);
    setIntegrationError("");
    try {
      const response = await fetch("/api/integrations/status", { cache: "no-store" });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || "读取工具配置状态失败。");
      setIntegrations(body.integrations || []);
    } catch (error) {
      setIntegrationError(error instanceof Error ? error.message : "读取工具配置状态失败。");
    } finally {
      setIntegrationLoading(false);
    }
  }

  async function refreshConfig() {
    setConfigError("");
    const response = await fetch("/api/config/env", { cache: "no-store" });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setConfigError(body?.error || "读取配置失败。");
      return;
    }
    setConfigFields(body.fields || []);
    setConfigDraft({});
  }

  async function saveConfigField(field: ConfigFieldView) {
    const nextValue = configDraft[field.key] ?? field.value ?? "";
    if (field.secret && field.configured && !nextValue.trim()) {
      setConfigMessage(`${field.label} 已保持不变。输入新值才会覆盖。`);
      setConfigError("");
      return;
    }

    setConfigSaving(field.key);
    setConfigMessage("");
    setConfigError("");
    const response = await fetch("/api/config/env", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ values: { [field.key]: nextValue } })
    });
    const body = await response.json().catch(() => null);
    setConfigSaving("");
    if (!response.ok) {
      setConfigError(body?.error || "保存配置失败。");
      return;
    }
    setConfigFields(body.fields || []);
    setConfigDraft((current) => ({ ...current, [field.key]: "" }));
    setConfigMessage(`${field.label} 已保存。`);
    void refreshIntegrations();
  }

  async function clearConfigField(field: ConfigFieldView) {
    if (!window.confirm(`确定清除「${field.label}」吗？`)) return;
    setConfigSaving(field.key);
    setConfigMessage("");
    setConfigError("");
    const response = await fetch("/api/config/env", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ values: { [field.key]: "" } })
    });
    const body = await response.json().catch(() => null);
    setConfigSaving("");
    if (!response.ok) {
      setConfigError(body?.error || "清除配置失败。");
      return;
    }
    setConfigFields(body.fields || []);
    setConfigDraft((current) => ({ ...current, [field.key]: "" }));
    setConfigMessage(`${field.label} 已清除。`);
    void refreshIntegrations();
  }

  useEffect(() => {
    void refreshIntegrations();
    void refreshConfig();
  }, []);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>工具中心</h1>
          <p>常用小工具直接可用；外部能力缺配置时可以从这里直接处理。</p>
        </div>
        <div className="top-actions">
          <Link className="text-button" href="/app/settings"><Settings size={16} aria-hidden />配置</Link>
          <Link className="text-button" href="/app/integrations"><Wrench size={16} aria-hidden />连接看板</Link>
        </div>
      </div>
      <section className="panel" style={{ marginBottom: 14 }}>
        <div className="panel-header">
          <h2>工具配置状态</h2>
          <button className="text-button" type="button" onClick={refreshIntegrations} disabled={integrationLoading}>
            <RefreshCw className={integrationLoading ? "spin" : ""} size={15} aria-hidden />{integrationLoading ? "刷新中" : "刷新"}
          </button>
        </div>
        <div className="signal-grid">
          <article className="signal-card">
            <span className="signal-label">可用能力</span>
            <strong>{connectedCount}</strong>
            <p>{integrations.length ? `共 ${integrations.length} 个外部能力，健康度 ${toolReadiness}%。` : "正在读取配置状态。"}</p>
          </article>
          <article className="signal-card">
            <span className="signal-label">待配置</span>
            <strong>{unconfiguredCount}</strong>
            <p>AI、n8n、GitHub、Gmail、Notion 都可以在设置里配置。</p>
          </article>
          <article className="signal-card">
            <span className="signal-label">异常连接</span>
            <strong>{errorCount}</strong>
            <p>异常时不会模拟成功，页面会保留真实错误状态。</p>
          </article>
        </div>
        {integrationError ? <p className="form-error" style={{ margin: 14 }}>{integrationError}</p> : null}
        <div className="integration-grid" style={{ padding: 14, paddingTop: 0 }}>
          {integrations.map((item) => (
            <article className="integration-card compact-integration-card" key={item.id}>
              <div className="integration-card-top">
                <span className="row-title">{item.name}</span>
                <span className={`badge ${item.state === "connected" ? "success" : item.state === "error" ? "failed" : "warning"}`}>
                  {item.state === "connected" ? <CheckCircle2 size={13} aria-hidden /> : item.state === "error" ? <AlertTriangle size={13} aria-hidden /> : null}
                  {item.state === "connected" ? "可用" : item.state === "error" ? "异常" : "待配置"}
                </span>
              </div>
              <p>{item.message}</p>
            </article>
          ))}
          {!integrations.length && !integrationError ? <div className="empty-state compact">正在检查工具依赖的连接配置。</div> : null}
        </div>
      </section>
      <section className="panel" style={{ marginBottom: 14 }}>
        <div className="panel-header">
          <h2>工具配置</h2>
          <button className="text-button" type="button" onClick={() => { void refreshConfig(); void refreshIntegrations(); }}>
            <RefreshCw size={15} aria-hidden />重新读取
          </button>
        </div>
        {configMessage ? <p className="config-message" style={{ margin: 14 }}>{configMessage}</p> : null}
        {configError ? <p className="form-error" style={{ margin: 14 }}>{configError}</p> : null}
        <div className="config-list">
          {Object.entries(groupLabels).map(([group, label]) => (
            <div className="config-row" key={group}>
              <div>
                <div className="row-title">{label}配置</div>
                <div className="row-subtitle" style={{ whiteSpace: "normal" }}>
                  {group === "ai" ? "OpenAI、OpenRouter、Ollama 模型入口。" :
                    group === "automation" ? "n8n 自动化运行需要的服务地址和密钥。" :
                      group === "external" ? "GitHub、Gmail、Notion 等外部来源。" :
                        group === "database" ? "Supabase 数据库和私有文件存储。" :
                          "MyOS 基础访问和应用地址。"}
                </div>
              </div>
              <div className="embedded-config-stack">
                {(groupedConfig[group] || []).map((field) => (
                  <div className="embedded-config-row" key={field.key}>
                    <div>
                      <span className="row-title">{field.label}</span>
                      <span className="row-subtitle" style={{ whiteSpace: "normal" }}>{field.description}</span>
                      <code className="config-key">{field.key}</code>
                    </div>
                    <div className="config-control">
                      <span className={`badge ${field.configured ? "success" : "warning"}`}>{field.configured ? field.maskedValue || "已配置" : "未配置"}</span>
                      <input
                        className="search-input"
                        type={field.secret ? "password" : "text"}
                        value={configDraft[field.key] ?? (field.secret ? "" : field.value)}
                        onChange={(event) => setConfigDraft((current) => ({ ...current, [field.key]: event.target.value }))}
                        placeholder={field.secret && field.configured ? "输入新值覆盖，留空不显示明文" : field.placeholder || field.key}
                      />
                      <button className="text-button" type="button" disabled={configSaving === field.key} onClick={() => void saveConfigField(field)}>
                        <Save size={15} aria-hidden />{configSaving === field.key ? "保存中" : "保存"}
                      </button>
                      <button className="icon-button" type="button" disabled={configSaving === field.key || !field.configured} aria-label={`清除 ${field.label}`} onClick={() => void clearConfigField(field)}>
                        <Trash2 size={15} aria-hidden />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!configFields.length && !configError ? <div className="empty-state compact">正在读取可配置项。</div> : null}
        </div>
      </section>
      <div className="panel-grid">
        <section className="panel">
          <div className="panel-header"><h2>JSON 格式化</h2><span className="badge success">active</span></div>
          <div className="tool-card-body">
            <textarea className="search-input" value={jsonInput} onChange={(event) => setJsonInput(event.target.value)} rows={5} />
            <div className="top-actions">
              <button className="text-button" type="button" onClick={() => { try { setJsonOutput(formatJson(jsonInput, "pretty")); setJsonError(""); } catch (error) { setJsonError(error instanceof Error ? error.message : "JSON 无效"); } }}>格式化</button>
              <button className="text-button" type="button" onClick={() => { try { setJsonOutput(formatJson(jsonInput, "minify")); setJsonError(""); } catch (error) { setJsonError(error instanceof Error ? error.message : "JSON 无效"); } }}>压缩</button>
              <button className="icon-button" type="button" aria-label="复制 JSON 输出" disabled={!jsonOutput} onClick={() => copyText(jsonOutput)}><Copy size={16} aria-hidden /></button>
            </div>
            {jsonError ? <p className="form-error">{jsonError}</p> : null}
            <pre className="tool-output">{jsonOutput || "输出会显示在这里"}</pre>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header"><h2>Base64 编码解码</h2><span className="badge success">active</span></div>
          <div className="tool-card-body">
            <input className="search-input" value={textInput} onChange={(event) => setTextInput(event.target.value)} />
            <div className="top-actions">
              <button className="text-button" type="button" onClick={() => setBase64Output(encodeBase64(textInput))}>编码</button>
              <button className="text-button" type="button" onClick={() => { try { setBase64Output(decodeBase64(textInput)); } catch { setBase64Output("Base64 内容无效"); } }}>解码</button>
              <button className="icon-button" type="button" aria-label="复制结果" disabled={!base64Output} onClick={() => copyText(base64Output)}><Copy size={16} aria-hidden /></button>
            </div>
            {copyMessage ? <p className="config-message compact-message">{copyMessage}</p> : null}
            <pre className="tool-output">{base64Output || "输出会显示在这里"}</pre>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header"><h2>Markdown 预览</h2><span className="badge success">active</span></div>
          <div className="tool-card-body">
            <textarea className="search-input" value={markdown} onChange={(event) => setMarkdown(event.target.value)} rows={5} />
            <div className="markdown-preview">{markdownPreview.length ? markdownPreview : <p>预览会显示在这里。</p>}</div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header"><h2>提示词变量提取</h2><span className="badge success">active</span></div>
          <div className="tool-card-body">
            <textarea className="search-input" value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={5} />
            <div className="table-list">
              {variables.length ? variables.map((item) => <div className="row" key={item}><span>{item}</span><span className="badge">variable</span></div>) : <div className="empty-state compact">没有发现变量。使用 {`{{变量名}`} 格式。</div>}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header"><h2>单片机定时器计算</h2><span className="badge success">active</span></div>
          <div className="tool-card-body">
            <div className="timer-grid">
              <label className="field-label">时钟 MHz<input className="search-input" type="number" min="0.001" step="0.001" value={clockMHz} onChange={(event) => setClockMHz(Number(event.target.value))} /></label>
              <label className="field-label">PSC 预分频<input className="search-input" type="number" min="0" step="1" value={prescaler} onChange={(event) => setPrescaler(Number(event.target.value))} /></label>
              <label className="field-label">目标周期 ms<input className="search-input" type="number" min="0.001" step="0.001" value={periodMs} onChange={(event) => setPeriodMs(Number(event.target.value))} /></label>
            </div>
            {timerResult.error ? (
              <p className="form-error">{timerResult.error}</p>
            ) : (
              <div className="table-list">
                <div className="row"><span>ARR 自动重装载值</span><strong>{timerResult.arr}</strong></div>
                <div className="row"><span>定时器计数频率</span><strong>{timerResult.timerHz.toFixed(2)} Hz</strong></div>
                <div className="row"><span>实际周期</span><strong>{timerResult.actualMs.toFixed(4)} ms</strong></div>
                <div className="row"><span>16 位定时器</span><span className={`badge ${timerResult.overflow16 ? "warning" : "success"}`}>{timerResult.overflow16 ? "ARR 超过 65535" : "可用"}</span></div>
              </div>
            )}
            <pre className="tool-output">{`// STM32 常见写法\nPSC = ${prescaler};\nARR = ${timerResult.error ? "参数无效" : timerResult.arr};`}</pre>
          </div>
        </section>
      </div>
      <section className="panel" style={{ marginTop: 14 }}>
        <div className="panel-header"><h2>工具注册表</h2></div>
        <div className="table-list">
          {toolsRegistry.map((tool) => <div className="row" key={tool.id}><span><span className="row-title">{tool.name}</span><span className="row-subtitle">{tool.description}</span></span><span className={`badge ${tool.enabled ? "success" : "warning"}`}>{tool.status}</span></div>)}
        </div>
      </section>
    </>
  );
}
