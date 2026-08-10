"use client";

import { AlertTriangle, CheckCircle2, Download, ExternalLink, RefreshCw, Save, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { postMyOSAction, publishMyOSData } from "@/lib/data/client-actions";
import type { MyOSData } from "@/lib/data/models";
import { DesktopSystemPanel } from "@/components/layout/desktop-system-panel";

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

type IntegrationStatus = {
  id: string;
  name: string;
  category: string;
  state: "connected" | "unconfigured" | "error";
  message: string;
  detail?: string;
};

const groupLabels = {
  owner: "基础",
  database: "数据库",
  ai: "AI",
  automation: "自动化",
  external: "外部工具"
};

export default function SettingsPage() {
  const [fields, setFields] = useState<ConfigFieldView[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState("");
  const [testing, setTesting] = useState(false);
  const [integrationStatuses, setIntegrationStatuses] = useState<IntegrationStatus[]>([]);
  const [importing, setImporting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const grouped = useMemo(() => {
    return fields.reduce<Record<string, ConfigFieldView[]>>((acc, field) => {
      acc[field.group] = [...(acc[field.group] || []), field];
      return acc;
    }, {});
  }, [fields]);

  async function refreshConfig() {
    setError("");
    const response = await fetch("/api/config/env", { cache: "no-store" });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(body?.error || "读取配置失败。");
      return;
    }
    setFields(body.fields || []);
    setDraft({});
  }

  async function saveField(field: ConfigFieldView) {
    const nextValue = draft[field.key] ?? field.value ?? "";
    if (field.secret && field.configured && !nextValue.trim()) {
      setMessage(`${field.label} 已保持不变。输入新值才会覆盖。`);
      setError("");
      return;
    }

    setSaving(field.key);
    setMessage("");
    setError("");
    const response = await fetch("/api/config/env", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ values: { [field.key]: nextValue } })
    });
    const body = await response.json().catch(() => null);
    setSaving("");
    if (!response.ok) {
      setError(body?.error || "保存配置失败。");
      return;
    }
    setFields(body.fields || []);
    setDraft((current) => ({ ...current, [field.key]: "" }));
    setMessage(`${field.label} 已保存。`);
    void testConnections();
  }

  async function clearField(field: ConfigFieldView) {
    setDraft((current) => ({ ...current, [field.key]: "" }));
    setSaving(field.key);
    const response = await fetch("/api/config/env", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ values: { [field.key]: "" } })
    });
    const body = await response.json().catch(() => null);
    setSaving("");
    if (!response.ok) {
      setError(body?.error || "清除配置失败。");
      return;
    }
    setFields(body.fields || []);
    setMessage(`${field.label} 已清除。`);
    void testConnections();
  }

  async function testConnections() {
    setTesting(true);
    setError("");
    const response = await fetch("/api/integrations/status", { cache: "no-store" });
    const body = await response.json().catch(() => null);
    setTesting(false);
    if (!response.ok) {
      setError(body?.error || "连接检测失败。");
      return;
    }
    setIntegrationStatuses(body.integrations || []);
  }

  async function exportData() {
    setError("");
    setMessage("");
    const response = await fetch("/api/myos/export", { cache: "no-store" });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error || "导出数据失败。");
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const disposition = response.headers.get("content-disposition") || "";
    const match = disposition.match(/filename="([^"]+)"/);
    link.href = url;
    link.download = match?.[1] || "myos-backup.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setMessage("MyOS 数据备份已导出。");
  }

  async function importData(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!window.confirm("导入备份会覆盖当前 MyOS 数据。请确认你已经导出了当前备份。继续吗？")) return;

    setImporting(true);
    setError("");
    setMessage("");
    const formData = new FormData();
    formData.set("file", file);

    try {
      const response = await fetch("/api/myos/import", { method: "POST", body: formData });
      const body = await response.json().catch(() => null) as { data?: MyOSData; error?: string } | null;
      if (!response.ok || !body?.data) throw new Error(body?.error || "导入备份失败。");
      publishMyOSData(body.data);
      setMessage("MyOS 数据已从备份恢复。");
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "导入备份失败。");
    } finally {
      setImporting(false);
    }
  }

  async function resetCurrentData() {
    if (!window.confirm("确定重置当前 MyOS 数据吗？建议先导出备份。")) return;
    setResetting(true);
    setError("");
    setMessage("");
    try {
      const next = await postMyOSAction({ type: "resetData" });
      publishMyOSData(next);
      setMessage("MyOS 数据已重置为初始数据。");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "重置数据失败。");
    } finally {
      setResetting(false);
    }
  }

  useEffect(() => {
    void refreshConfig();
    void testConnections();
  }, []);

  return (
    <>
      <div className="page-header"><div><h1>系统设置</h1><p>在 MyOS 内配置数据库、AI、n8n、GitHub、Gmail、Notion 等连接。密钥只保存在服务端。</p></div></div>
      {message ? <p className="config-message">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      <section className="panel settings-guide">
        <div className="panel-header"><h2>AI 配置入口</h2></div>
        <p className="row-subtitle">API Provider 在本页的“AI 配置”中保存；保存后到 AI 工作台选择模型。Codex CLI 和 GitHub Copilot CLI 属于本机 Agent，请在能力中心管理，不要把它们的本地登录凭据复制到网页。</p>
        <div className="button-row">
          <Link className="text-button" href="/app/ai">打开 AI 工作台 <ExternalLink size={14} aria-hidden /></Link>
          <Link className="text-button" href="/app/capabilities">管理 CLI、MCP 与 Skill <ExternalLink size={14} aria-hidden /></Link>
        </div>
      </section>
      <div className="settings-layout">
        <div className="settings-main">
          {Object.entries(groupLabels).map(([group, label]) => (
            <section className="panel" key={group}>
              <div className="panel-header"><h2>{label}配置</h2></div>
              <div className="config-list">
                {(grouped[group] || []).map((field) => (
                  <div className="config-row" key={field.key}>
                    <div>
                      <div className="row-title">{field.label}</div>
                      <div className="row-subtitle" style={{ whiteSpace: "normal" }}>{field.description}</div>
                      <code className="config-key">{field.key}</code>
                    </div>
                    <div className="config-control">
                      <span className={`badge ${field.configured ? "success" : "warning"}`}>{field.configured ? field.maskedValue || "已配置" : "未配置"}</span>
                      <input
                        className="search-input"
                        type={field.secret ? "password" : "text"}
                        value={draft[field.key] ?? (field.secret ? "" : field.value)}
                        onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))}
                        placeholder={field.secret && field.configured ? "输入新值覆盖，留空不显示明文" : field.placeholder || field.key}
                      />
                      <button className="text-button" type="button" disabled={saving === field.key} onClick={() => saveField(field)}><Save size={15} aria-hidden />保存</button>
                      <button className="icon-button" type="button" disabled={saving === field.key || !field.configured} aria-label={`清除 ${field.label}`} onClick={() => clearField(field)}><Trash2 size={15} aria-hidden /></button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
        <aside className="today-side">
          <DesktopSystemPanel />
          <section className="panel">
            <div className="panel-header">
              <h2>连接检测</h2>
              <button className="text-button" type="button" onClick={testConnections} disabled={testing}>
                <RefreshCw className={testing ? "spin" : ""} size={15} aria-hidden />{testing ? "检测中" : "检测"}
              </button>
            </div>
            <div className="table-list">
              {integrationStatuses.map((item) => (
                <div className="row" key={item.id}>
                  <span>
                    <span className="row-title">{item.name}</span>
                    <span className="row-subtitle">{item.message}</span>
                  </span>
                  <span className={`badge ${item.state === "connected" ? "success" : item.state === "error" ? "failed" : "warning"}`}>
                    {item.state === "connected" ? <CheckCircle2 size={13} aria-hidden /> : item.state === "error" ? <AlertTriangle size={13} aria-hidden /> : null}
                    {item.state === "connected" ? "可用" : item.state === "error" ? "异常" : "未配置"}
                  </span>
                </div>
              ))}
              {!integrationStatuses.length ? <div className="empty-state compact">点击检测，确认数据库、AI、n8n、GitHub、Gmail 和 Notion 是否可用。</div> : null}
            </div>
          </section>
          <section className="panel"><div className="panel-header"><h2>配置说明</h2></div><div className="table-list"><div className="row"><span>保存位置</span><strong>.env.local</strong></div><div className="row"><span>浏览器可见密钥</span><strong>不会显示</strong></div><div className="row"><span>保存后</span><strong>立即用于当前服务</strong></div></div></section>
          <section className="panel">
            <div className="panel-header"><h2>数据</h2></div>
            <div className="table-list">
              <div className="row">
                <span><span className="row-title">导出备份</span><span className="row-subtitle">下载项目、任务、文件记录、知识、提示词和生活数据；不包含原始文件二进制。</span></span>
                <button className="text-button" type="button" onClick={exportData}><Download size={15} aria-hidden />导出</button>
              </div>
              <div className="row">
                <span><span className="row-title">导入备份</span><span className="row-subtitle">从 MyOS JSON 备份恢复记录，会覆盖当前数据；不会恢复缺失的原始文件。</span></span>
                <label className="text-button">
                  <Upload size={15} aria-hidden />{importing ? "导入中" : "选择文件"}
                  <input type="file" accept="application/json,.json" style={{ display: "none" }} disabled={importing} onChange={importData} />
                </label>
              </div>
              <div className="row">
                <span><span className="row-title">重置当前数据</span><span className="row-subtitle">危险操作，建议先导出备份。</span></span>
                <button className="text-button" type="button" disabled={resetting} onClick={resetCurrentData}>{resetting ? "重置中" : "重置"}</button>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
