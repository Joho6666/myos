"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { postMyOSAction, publishMyOSData } from "@/lib/data/client-actions";
import { useMyOSData } from "@/lib/data/store";
import type { InboxItem } from "@/lib/data/models";

export default function BookmarksPage() {
  const { data } = useMyOSData();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("链接收藏");
  const [editingId, setEditingId] = useState("");
  const [draft, setDraft] = useState({ title: "", category: "" });
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const linkItems = data.inbox.filter((item) => item.type === "link" || item.category.includes("收藏") || item.category.includes("链接"));

  function startEdit(item: InboxItem) {
    setEditingId(item.id);
    setDraft({ title: item.title, category: item.category });
  }

  async function createBookmark(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    setBusy("create");
    setMessage("");
    setError("");
    try {
      const next = await postMyOSAction({
        type: "addInbox",
        payload: { title, type: "link", category }
      });
      publishMyOSData(next);
      setTitle("");
      setMessage(`${title} 已保存到收藏夹。`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "保存收藏失败。");
    } finally {
      setBusy("");
    }
  }

  async function saveBookmark(item: InboxItem) {
    if (!draft.title.trim() || !draft.category.trim()) return;
    setBusy(item.id);
    setMessage("");
    setError("");
    try {
      const next = await postMyOSAction({
        type: "updateInbox",
        payload: { ...item, title: draft.title, category: draft.category }
      });
      publishMyOSData(next);
      setEditingId("");
      setMessage(`${draft.title} 已更新。`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "更新收藏失败。");
    } finally {
      setBusy("");
    }
  }

  async function removeBookmark(item: InboxItem) {
    if (!window.confirm(`确定删除「${item.title}」吗？`)) return;
    setBusy(item.id);
    setMessage("");
    setError("");
    try {
      const next = await postMyOSAction({
        type: "deleteInbox",
        payload: { id: item.id }
      });
      publishMyOSData(next);
      setMessage(`${item.title} 已删除。`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除收藏失败。");
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <div className="page-header"><div><h1>收藏夹</h1><p>保存 GitHub 项目、AI 工具、教程链接和业务参考资料。</p></div></div>
      {message ? <p className="config-message">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      <form className="form-inline" onSubmit={createBookmark}>
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="链接或标题，例如 GitHub: awesome-agent" required />
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option>链接收藏</option><option>GitHub</option><option>AI 工具</option><option>教程</option><option>业务参考</option>
        </select>
        <button className="primary-button" type="submit" disabled={busy === "create"}><Plus size={16} aria-hidden />{busy === "create" ? "保存中" : "保存收藏"}</button>
      </form>
      <section className="panel">
        <div className="panel-header"><h2>收藏内容</h2></div>
        <div className="table-list">
          {linkItems.length ? linkItems.map((item) => (
            <div className="row" key={item.id}>
              {editingId === item.id ? (
                <>
                  <span style={{ display: "grid", gap: 8 }}>
                    <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
                    <input value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} />
                  </span>
                  <span style={{ display: "inline-flex", gap: 8 }}>
                    <button className="text-button" type="button" disabled={busy === item.id} onClick={() => saveBookmark(item)}>{busy === item.id ? "保存中" : "保存"}</button>
                    <button className="text-button" type="button" onClick={() => setEditingId("")}>取消</button>
                  </span>
                </>
              ) : (
                <>
                  <span><span className="row-title">{item.title}</span><span className="row-subtitle">{item.category} / {item.createdAt}</span></span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span className={`badge ${item.status}`}>{item.status}</span>
                    <button className="icon-button" type="button" aria-label="编辑收藏" onClick={() => startEdit(item)}><Pencil size={15} aria-hidden /></button>
                    <button className="icon-button" type="button" aria-label="删除收藏" disabled={busy === item.id} onClick={() => removeBookmark(item)}><Trash2 size={15} aria-hidden /></button>
                  </span>
                </>
              )}
            </div>
          )) : <div className="empty-state">还没有收藏。用上方输入框先保存一个链接。</div>}
        </div>
      </section>
    </>
  );
}
