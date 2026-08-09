"use client";

import { Copy, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { postMyOSAction, publishMyOSData } from "@/lib/data/client-actions";
import { useMyOSData } from "@/lib/data/store";
import type { Prompt } from "@/lib/data/models";

export default function PromptsPage() {
  const { data } = useMyOSData();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Codex开发");
  const [content, setContent] = useState("");
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState("");
  const [draft, setDraft] = useState({ title: "", category: "", content: "", favorite: false });
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const prompts = useMemo(() => data.prompts.filter((item) => item.title.includes(query) || item.category.includes(query)), [data.prompts, query]);

  function startEdit(prompt: Prompt) {
    setEditingId(prompt.id);
    setDraft({ title: prompt.title, category: prompt.category, content: prompt.content, favorite: prompt.favorite });
  }

  async function createPrompt(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setBusy("create");
    setMessage("");
    setError("");
    try {
      const next = await postMyOSAction({
        type: "addPrompt",
        payload: { title, category, content }
      });
      publishMyOSData(next);
      setTitle("");
      setContent("");
      setMessage(`${title} 已保存。`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "保存提示词失败。");
    } finally {
      setBusy("");
    }
  }

  async function saveEdit(id: string) {
    if (!draft.title.trim() || !draft.content.trim()) return;
    setBusy(id);
    setMessage("");
    setError("");
    try {
      const next = await postMyOSAction({
        type: "updatePrompt",
        payload: { id, ...draft }
      });
      publishMyOSData(next);
      setEditingId("");
      setMessage(`${draft.title} 已更新。`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "更新提示词失败。");
    } finally {
      setBusy("");
    }
  }

  async function toggleFavorite(prompt: Prompt) {
    setBusy(prompt.id);
    setMessage("");
    setError("");
    try {
      const next = await postMyOSAction({
        type: "updatePrompt",
        payload: { ...prompt, favorite: !prompt.favorite }
      });
      publishMyOSData(next);
      setMessage(prompt.favorite ? `${prompt.title} 已取消收藏。` : `${prompt.title} 已收藏。`);
    } catch (favoriteError) {
      setError(favoriteError instanceof Error ? favoriteError.message : "更新收藏状态失败。");
    } finally {
      setBusy("");
    }
  }

  async function removePrompt(prompt: Prompt) {
    if (!window.confirm(`确定删除「${prompt.title}」吗？`)) return;
    setBusy(prompt.id);
    setMessage("");
    setError("");
    try {
      const next = await postMyOSAction({
        type: "deletePrompt",
        payload: { id: prompt.id }
      });
      publishMyOSData(next);
      setMessage(`${prompt.title} 已删除。`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除提示词失败。");
    } finally {
      setBusy("");
    }
  }

  async function copyPrompt(prompt: Prompt) {
    try {
      await navigator.clipboard.writeText(prompt.content);
      setMessage(`${prompt.title} 已复制。`);
      setError("");
    } catch {
      setError("复制失败，请手动选择提示词正文。");
      setMessage("");
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>提示词库</h1>
          <p>沉淀 Codex、文档、工程和业务场景下的可复用提示词。</p>
        </div>
      </div>
      {message ? <p className="config-message">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      <form className="form-inline" onSubmit={createPrompt}>
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="提示词标题" required />
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option>Codex开发</option><option>UI设计</option><option>n8n</option><option>Word</option><option>单片机</option><option>数据分析</option>
        </select>
        <input value={content} onChange={(event) => setContent(event.target.value)} placeholder="提示词正文，支持 {{variables}}" required />
        <button className="primary-button" type="submit" disabled={busy === "create"}><Plus size={16} aria-hidden />{busy === "create" ? "保存中" : "保存"}</button>
      </form>
      <input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索提示词..." style={{ width: "100%", marginBottom: 14 }} />
      <div className="panel-grid">
        {prompts.map((prompt) => (
          <section className="panel" key={prompt.id}>
            <div className="panel-header"><h2>{prompt.favorite ? "★ " : ""}{prompt.title}</h2><span className="badge">{prompt.category}</span></div>
            <div style={{ padding: 14 }}>
              {editingId === prompt.id ? (
                <div style={{ display: "grid", gap: 10 }}>
                  <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
                  <input value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} />
                  <textarea value={draft.content} onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))} rows={5} />
                  <span style={{ display: "inline-flex", gap: 8 }}><button className="text-button" type="button" disabled={busy === prompt.id} onClick={() => saveEdit(prompt.id)}>{busy === prompt.id ? "保存中" : "保存"}</button><button className="text-button" type="button" onClick={() => setEditingId("")}>取消</button></span>
                </div>
              ) : (
                <>
                  <p className="row-subtitle" style={{ whiteSpace: "normal" }}>{prompt.content}</p>
                  <span style={{ display: "inline-flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="text-button" type="button" onClick={() => copyPrompt(prompt)}><Copy size={15} aria-hidden />复制</button>
                    <button className="text-button" type="button" disabled={busy === prompt.id} onClick={() => toggleFavorite(prompt)}><Star size={15} aria-hidden />{prompt.favorite ? "取消收藏" : "收藏"}</button>
                    <button className="text-button" type="button" onClick={() => startEdit(prompt)}><Pencil size={15} aria-hidden />编辑</button>
                    <button className="text-button" type="button" disabled={busy === prompt.id} onClick={() => removePrompt(prompt)}><Trash2 size={15} aria-hidden />删除</button>
                  </span>
                </>
              )}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
