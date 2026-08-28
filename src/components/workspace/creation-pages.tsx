"use client";

import { ArrowLeft, Check, FileText, FolderPlus, ListPlus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { postMyOSAction, publishMyOSData } from "@/lib/data/client-actions";
import { useMyOSData } from "@/lib/data/store";
import type { Priority } from "@/lib/data/models";

type Kind = "task" | "project" | "inbox" | "note";
const config = {
  task: { title: "写下一个任务", eyebrow: "任务工作区", icon: ListPlus, description: "把下一步写清楚，交给今天或一个项目。", back: "/app/tasks" },
  project: { title: "开始一个项目", eyebrow: "项目工作区", icon: FolderPlus, description: "从愿景到下一步，建立一个可以持续推进的空间。", back: "/app/projects" },
  inbox: { title: "快速记录", eyebrow: "万能收件箱", icon: Sparkles, description: "先捕捉，不打断思路；之后再整理成任务或知识。", back: "/app/inbox" },
  note: { title: "进入专注书写", eyebrow: "知识工作区", icon: FileText, description: "把想法写完整，保存为可回看的知识卡片。", back: "/app/knowledge" }
} as const;

export function CreationPage({ kind }: { kind: Kind }) {
  const { data } = useMyOSData();
  const router = useRouter();
  const meta = config[kind];
  const Icon = meta.icon;
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState(kind === "project" ? "个人项目" : "待分类");
  const [priority, setPriority] = useState<Priority>("medium");
  const [project, setProject] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setBusy(true); setError("");
    try {
      const payload = kind === "task"
        ? { title: title.trim(), priority, project: project || undefined, due: "今天", plannedDate: "today", todayFocus: true }
        : kind === "project"
          ? { name: title.trim(), category, nextAction: body.trim() || "明确第一个下一步" }
          : kind === "inbox"
            ? { title: title.trim(), type: "idea" as const, category }
            : { title: title.trim(), type: category || "普通笔记", summary: body.trim() || "" };
      const next = kind === "task"
        ? await postMyOSAction({ type: "addTask", payload: payload as { title: string; priority: Priority; project?: string; due: string; plannedDate: string; todayFocus: boolean } })
        : kind === "project"
          ? await postMyOSAction({ type: "addProject", payload: payload as { name: string; category: string; nextAction: string } })
          : kind === "inbox"
            ? await postMyOSAction({ type: "addInbox", payload: payload as { title: string; type: "idea"; category: string } })
            : await postMyOSAction({ type: "addNote", payload: payload as { title: string; type: string; summary: string } });
      publishMyOSData(next);
      router.push(meta.back);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "保存失败，请稍后重试。");
    } finally { setBusy(false); }
  }

  return <main className="creation-page">
    <Link className="creation-back" href={meta.back}><ArrowLeft size={16} aria-hidden />返回{kind === "task" ? "任务" : kind === "project" ? "项目" : kind === "inbox" ? "收件箱" : "知识库"}</Link>
    <div className="creation-grid">
      <section className="creation-intro"><span className="creation-icon"><Icon size={22} aria-hidden /></span><p className="eyebrow">{meta.eyebrow}</p><h1>{meta.title}</h1><p>{meta.description}</p><div className="creation-tip"><Check size={16} aria-hidden /><span>快捷键 <kbd>⌘</kbd><kbd>Enter</kbd> 保存</span></div></section>
      <form className="creation-card" onSubmit={submit}>
        {error ? <p className="form-error">{error}</p> : null}
        <label>标题<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder={kind === "note" ? "例如：本周产品复盘" : "写下一个清晰的标题"} required /></label>
        {kind === "task" ? <><label>归属项目<select value={project} onChange={(event) => setProject(event.target.value)}><option value="">个人任务</option>{data.projects.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label><label>优先级<select value={priority} onChange={(event) => setPriority(event.target.value as Priority)}><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></label></> : null}
        {kind === "project" || kind === "inbox" ? <label>{kind === "project" ? "项目分类" : "分类"}<input value={category} onChange={(event) => setCategory(event.target.value)} /></label> : null}
        {kind === "note" ? <label>内容<textarea className="creation-editor" value={body} onChange={(event) => setBody(event.target.value)} placeholder="从这里开始写，支持长文本与复盘记录…" /></label> : kind === "project" ? <label>下一步<textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="完成后，下一步具体要做什么？" /></label> : null}
        <button className="primary-button creation-submit" disabled={busy}>{busy ? "保存中…" : "保存并继续"}</button>
      </form>
    </div>
  </main>;
}
