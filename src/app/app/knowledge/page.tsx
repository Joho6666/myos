"use client";

import { Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { postMyOSAction, publishMyOSData } from "@/lib/data/client-actions";
import { useMyOSData } from "@/lib/data/store";
import type { Note } from "@/lib/data/models";

export default function KnowledgePage() {
  const { data } = useMyOSData();
  const [title, setTitle] = useState("");
  const [type, setType] = useState("普通笔记");
  const [summary, setSummary] = useState("");
  const [editingId, setEditingId] = useState("");
  const [draft, setDraft] = useState({ title: "", type: "", summary: "", favorite: false });
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function startEdit(note: Note) {
    setEditingId(note.id);
    setDraft({ title: note.title, type: note.type, summary: note.summary, favorite: note.favorite });
  }

  async function createNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !summary.trim()) return;
    setBusy("create");
    setMessage("");
    setError("");
    try {
      const next = await postMyOSAction({
        type: "addNote",
        payload: { title, type, summary }
      });
      publishMyOSData(next);
      setTitle("");
      setSummary("");
      setMessage(`${title} 已记录。`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "记录知识失败。");
    } finally {
      setBusy("");
    }
  }

  async function saveEdit(id: string) {
    if (!draft.title.trim()) return;
    setBusy(id);
    setMessage("");
    setError("");
    try {
      const next = await postMyOSAction({
        type: "updateNote",
        payload: { id, ...draft }
      });
      publishMyOSData(next);
      setEditingId("");
      setMessage(`${draft.title} 已更新。`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "更新知识失败。");
    } finally {
      setBusy("");
    }
  }

  async function toggleFavorite(note: Note) {
    setBusy(note.id);
    setMessage("");
    setError("");
    try {
      const next = await postMyOSAction({
        type: "updateNote",
        payload: { ...note, favorite: !note.favorite }
      });
      publishMyOSData(next);
      setMessage(note.favorite ? `${note.title} 已取消收藏。` : `${note.title} 已收藏。`);
    } catch (favoriteError) {
      setError(favoriteError instanceof Error ? favoriteError.message : "更新收藏状态失败。");
    } finally {
      setBusy("");
    }
  }

  async function removeNote(note: Note) {
    if (!window.confirm(`确定删除「${note.title}」吗？`)) return;
    setBusy(note.id);
    setMessage("");
    setError("");
    try {
      const next = await postMyOSAction({
        type: "deleteNote",
        payload: { id: note.id }
      });
      publishMyOSData(next);
      setMessage(`${note.title} 已删除。`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除知识失败。");
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>知识库</h1>
          <p>保存教程、开发经验、故障记录、工程规则和项目复盘。</p>
        </div>
      </div>
      {message ? <p className="config-message">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      <form className="form-inline" onSubmit={createNote}>
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="知识标题" required />
        <select value={type} onChange={(event) => setType(event.target.value)}>
          <option>普通笔记</option><option>教程</option><option>开发经验</option><option>故障记录</option><option>工程规则</option>
        </select>
        <input value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="摘要" required />
        <button className="primary-button" type="submit" disabled={busy === "create"}><Plus size={16} aria-hidden />{busy === "create" ? "记录中" : "记录"}</button>
      </form>
      <section className="panel">
        <table className="content-table">
          <thead><tr><th>标题</th><th>类型</th><th>摘要</th><th>更新</th><th>操作</th></tr></thead>
          <tbody>{data.notes.map((note) => (
            <tr key={note.id}>
              {editingId === note.id ? (
                <>
                  <td><input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} /></td>
                  <td><input value={draft.type} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value }))} /></td>
                  <td><input value={draft.summary} onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))} /></td>
                  <td>{note.updatedAt}</td>
                  <td><span style={{ display: "inline-flex", gap: 8 }}><button className="text-button" type="button" disabled={busy === note.id} onClick={() => saveEdit(note.id)}>{busy === note.id ? "保存中" : "保存"}</button><button className="text-button" type="button" onClick={() => setEditingId("")}>取消</button></span></td>
                </>
              ) : (
                <>
                  <td>{note.favorite ? "★ " : ""}{note.title}</td><td>{note.type}</td><td>{note.summary}</td><td>{note.updatedAt}</td>
                  <td><span style={{ display: "inline-flex", gap: 8 }}><button className="icon-button" type="button" aria-label="收藏知识" disabled={busy === note.id} onClick={() => toggleFavorite(note)}><Star size={15} aria-hidden /></button><button className="icon-button" type="button" aria-label="编辑知识" onClick={() => startEdit(note)}><Pencil size={15} aria-hidden /></button><button className="icon-button" type="button" aria-label="删除知识" disabled={busy === note.id} onClick={() => removeNote(note)}><Trash2 size={15} aria-hidden /></button></span></td>
                </>
              )}
            </tr>
          ))}</tbody>
        </table>
      </section>
    </>
  );
}
