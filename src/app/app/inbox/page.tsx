"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { postMyOSAction, publishMyOSData } from "@/lib/data/client-actions";
import { useMyOSData } from "@/lib/data/store";
import type { InboxItem } from "@/lib/data/models";

export default function InboxPage() {
  const { data } = useMyOSData();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"text" | "file" | "link" | "idea">("text");
  const [category, setCategory] = useState("待分类");
  const [editingId, setEditingId] = useState("");
  const [draft, setDraft] = useState({ title: "", type: "text" as InboxItem["type"], category: "", status: "pending" as InboxItem["status"] });
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function startEdit(item: InboxItem) {
    setEditingId(item.id);
    setDraft({ title: item.title, type: item.type, category: item.category, status: item.status });
  }

  async function createInboxItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    setBusy("create");
    setMessage("");
    setError("");
    try {
      const next = await postMyOSAction({
        type: "addInbox",
        payload: { title, type, category }
      });
      publishMyOSData(next);
      setTitle("");
      setMessage(`${title} 已添加到收件箱。`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "添加收件箱条目失败。");
    } finally {
      setBusy("");
    }
  }

  async function saveEdit(id: string) {
    if (!draft.title.trim() || !draft.category.trim()) return;
    setBusy(id);
    setMessage("");
    setError("");
    try {
      const next = await postMyOSAction({
        type: "updateInbox",
        payload: { id, ...draft }
      });
      publishMyOSData(next);
      setEditingId("");
      setMessage(`${draft.title} 已更新。`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "更新收件箱条目失败。");
    } finally {
      setBusy("");
    }
  }

  async function removeInboxItem(item: InboxItem) {
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
      setError(deleteError instanceof Error ? deleteError.message : "删除收件箱条目失败。");
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>万能收件箱</h1>
          <p>先把文本、链接、文件和灵感收进来，再转成项目、任务、知识或提示词。</p>
        </div>
      </div>
      {message ? <p className="config-message">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      <form className="form-inline" onSubmit={createInboxItem}>
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="条目标题" required />
        <select value={type} onChange={(event) => setType(event.target.value as "text" | "file" | "link" | "idea")}>
          <option value="text">文本</option>
          <option value="file">文件</option>
          <option value="link">链接</option>
          <option value="idea">灵感</option>
        </select>
        <input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="分类" />
        <button className="primary-button" type="submit" disabled={busy === "create"}><Plus size={16} aria-hidden />{busy === "create" ? "添加中" : "添加"}</button>
      </form>
      <section className="panel">
        <table className="content-table">
          <thead><tr><th>标题</th><th>类型</th><th>分类</th><th>状态</th><th>创建</th><th>操作</th></tr></thead>
          <tbody>{data.inbox.map((item) => (
            <tr key={item.id}>
              {editingId === item.id ? (
                <>
                  <td><input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} /></td>
                  <td><select value={draft.type} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value as InboxItem["type"] }))}><option value="text">文本</option><option value="file">文件</option><option value="link">链接</option><option value="idea">灵感</option></select></td>
                  <td><input value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} /></td>
                  <td><select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as InboxItem["status"] }))}><option value="pending">pending</option><option value="classified">classified</option><option value="archived">archived</option></select></td>
                  <td>{item.createdAt}</td>
                  <td><span style={{ display: "inline-flex", gap: 8 }}><button className="text-button" type="button" disabled={busy === item.id} onClick={() => saveEdit(item.id)}>{busy === item.id ? "保存中" : "保存"}</button><button className="text-button" type="button" onClick={() => setEditingId("")}>取消</button></span></td>
                </>
              ) : (
                <>
                  <td>{item.title}</td><td>{item.type}</td><td>{item.category}</td><td><span className="badge">{item.status}</span></td><td>{item.createdAt}</td>
                  <td><span style={{ display: "inline-flex", gap: 8 }}><button className="icon-button" type="button" aria-label="编辑收件箱条目" onClick={() => startEdit(item)}><Pencil size={15} aria-hidden /></button><button className="icon-button" type="button" aria-label="删除收件箱条目" disabled={busy === item.id} onClick={() => removeInboxItem(item)}><Trash2 size={15} aria-hidden /></button></span></td>
                </>
              )}
            </tr>
          ))}</tbody>
        </table>
      </section>
    </>
  );
}
