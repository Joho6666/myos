"use client";

import { Check, ChevronDown, FolderPlus, Lightbulb, RotateCcw, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { postMyOSAction, publishMyOSData } from "@/lib/data/client-actions";
import { useMyOSData } from "@/lib/data/store";
import { CreationCenterContext } from "./creation-context";
import { parseCreationIntent } from "./parse-creation-intent";
import { creationRegistry, type CreationIntent, type CreationOpenOptions, type CreationType } from "./types";

const iconMap = { task: Check, project: FolderPlus, inbox: Lightbulb };
const actionMap = { task: "任务", project: "项目", inbox: "想法" };
const routeMap = { task: "/app/tasks", project: "/app/projects", inbox: "/app/inbox" };
type Draft = { title: string; project: string; priority: "high" | "medium" | "low"; due: string; plannedDate: string; reminderTime: string; todayFocus: boolean; category: string; nextAction: string; };
const emptyDraft: Draft = { title: "", project: "", priority: "medium", due: "今天", plannedDate: "", reminderTime: "", todayFocus: false, category: "快速记录", nextAction: "" };

function intentToDraft(intent: CreationIntent | null): Draft {
  if (!intent) return emptyDraft;
  return { title: intent.title, project: intent.projectName || "", priority: intent.priority, due: intent.due, plannedDate: intent.plannedDate, reminderTime: intent.reminderTime || "", todayFocus: intent.todayFocus, category: intent.category, nextAction: intent.nextAction };
}

export function CreationCenterProvider({ children, timeZone }: { children: React.ReactNode; timeZone: string }) {
  const { data } = useMyOSData();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<CreationType>("task");
  const [text, setText] = useState("");
  const [adjusting, setAdjusting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ type: CreationType; id: string; title: string } | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const triggerRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef(0);
  const project = pathname.startsWith("/app/projects/") ? data.projects.find((item) => pathname.endsWith(item.id)) : undefined;
  const context = useMemo(() => ({ pathname, project: project ? { id: project.id, name: project.name } : undefined }), [pathname, project]);
  const intent = useMemo(() => parseCreationIntent(text, data.projects, context, timeZone), [text, data.projects, context, timeZone]);

  const closeCreation = useCallback(() => {
    setOpen(false); setAdjusting(false); setError(""); setSuccess(null);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  }, []);
  const openCreation = useCallback((options: CreationOpenOptions = {}) => {
    triggerRef.current = options.trigger || (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    const nextType = options.type || (context.project ? "task" : pathname.startsWith("/app/projects") ? "project" : pathname.startsWith("/app/inbox") ? "inbox" : "task");
    setType(nextType); setText(options.text || ""); setDraft({ ...emptyDraft, project: context.project?.name || "" }); setAdjusting(false); setError(""); setSuccess(null); setOpen(true);
  }, [context.project, pathname]);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("create");
    if (requested === "task" || requested === "project" || requested === "inbox") {
      openCreation({ type: requested });
      router.replace(pathname, { scroll: false });
    }
  }, [openCreation, pathname, router]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "n") { event.preventDefault(); openCreation({ trigger: target }); }
      if (!open) return;
      if (event.key === "Escape") { event.preventDefault(); closeCreation(); }
      if ((event.key === "ArrowDown" || event.key === "ArrowUp") && target?.tagName !== "TEXTAREA" && target?.tagName !== "INPUT") {
        event.preventDefault(); const types = creationRegistry.map((item) => item.id); const index = types.indexOf(type); setType(types[(index + (event.key === "ArrowDown" ? 1 : types.length - 1)) % types.length]);
      }
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href]'));
        if (!focusable.length) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }
    window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeCreation, open, openCreation, type]);

  useEffect(() => { if (!adjusting && intent?.type && intent.confidence === "high") { setType(intent.type); setDraft(intentToDraft(intent)); } }, [adjusting, intent]);
  useEffect(() => { if (!success) return; const timer = window.setTimeout(() => setSuccess(null), 10000); return () => window.clearTimeout(timer); }, [success]);

  async function submit() {
    const activeDraft = adjusting || !intent?.type ? draft : intentToDraft(intent);
    if (!activeDraft.title.trim()) { setError("请先写下要创建的内容。"); return; }
    setSaving(true); setError("");
    try {
      const previous = new Set(type === "task" ? data.tasks.map((item) => item.id) : type === "project" ? data.projects.map((item) => item.id) : data.inbox.map((item) => item.id));
      const next = type === "task"
        ? await postMyOSAction({ type: "addTask", payload: { title: activeDraft.title.trim(), project: activeDraft.project || undefined, priority: activeDraft.priority, due: activeDraft.due, plannedDate: activeDraft.plannedDate || undefined, todayFocus: activeDraft.todayFocus, reminderTime: activeDraft.reminderTime || undefined } })
        : type === "project"
          ? await postMyOSAction({ type: "addProject", payload: { name: activeDraft.title.trim(), category: activeDraft.category || "个人项目", nextAction: activeDraft.nextAction.trim() || "明确项目目标和下一步行动" } })
          : await postMyOSAction({ type: "addInbox", payload: { title: activeDraft.title.trim(), type: "idea", category: activeDraft.category || "快速记录" } });
      publishMyOSData(next);
      const items = type === "task" ? next.tasks : type === "project" ? next.projects : next.inbox;
      const created = items.find((item) => !previous.has(item.id));
      if (!created) throw new Error("已保存，但未能识别刚创建的内容。");
      setSuccess({ type, id: created.id, title: type === "project" ? (created as typeof next.projects[number]).name : (created as typeof next.tasks[number]).title });
      setText(""); setAdjusting(false); setDraft({ ...emptyDraft, project: context.project?.name || "" });
    } catch (submissionError) { setError(submissionError instanceof Error ? submissionError.message : "创建失败，请重试。"); }
    finally { setSaving(false); }
  }

  async function undo() {
    if (!success) return;
    setSaving(true); setError("");
    try {
      const action = success.type === "task" ? { type: "deleteTask" as const, payload: { id: success.id } } : success.type === "project" ? { type: "deleteProject" as const, payload: { id: success.id } } : { type: "deleteInbox" as const, payload: { id: success.id } };
      publishMyOSData(await postMyOSAction(action)); setSuccess(null);
    } catch (undoError) { setError(undoError instanceof Error ? undoError.message : "撤销失败，请重试。"); }
    finally { setSaving(false); }
  }

  const chooseType = (next: CreationType) => { setType(next); setAdjusting(true); setDraft(intentToDraft(intent)); };
  const chooseProject = (value: string) => {
    if (value === "__new_project__") {
      setType("project");
      setText("");
      setDraft({ ...emptyDraft, category: "个人项目" });
      setAdjusting(true);
      return;
    }
    setDraft((current) => ({ ...current, project: value }));
  };
  const activeDraft = adjusting || !intent?.type ? draft : intentToDraft(intent);
  const Icon = iconMap[type];

  return <CreationCenterContext.Provider value={{ openCreation, closeCreation }}>{children}{open ? <div className="creation-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) closeCreation(); }}>
    <div className="creation-center" ref={dialogRef} role="dialog" aria-modal="true" aria-label="创建中心" onTouchStart={(event) => { touchStart.current = event.touches[0].clientY; }} onTouchEnd={(event) => { if (event.changedTouches[0].clientY - touchStart.current > 90) closeCreation(); }}>
      <header><div><Sparkles size={19} aria-hidden /><h2>创建</h2></div><button className="icon-button" type="button" onClick={closeCreation} aria-label="关闭创建中心"><X size={18} aria-hidden /></button></header>
      {success ? <section className="creation-success" aria-live="polite"><span><Check size={23} aria-hidden /></span><h3>已创建{actionMap[success.type]}</h3><strong>{success.title}</strong><p>{success.type === "project" ? "MyOS 已准备好项目工作区。" : success.type === "task" ? "已加入你的工作流。" : "已保存到收件箱。"}</p><div><Link className="primary-button" href={success.type === "project" ? `/app/projects/${success.id}` : routeMap[success.type]} onClick={closeCreation}>打开</Link><button className="text-button" type="button" onClick={undo} disabled={saving}><RotateCcw size={15} aria-hidden />撤销</button></div></section> : <>
        <label className="creation-input"><span className="sr-only">描述你想创建的内容</span><textarea autoFocus value={text} onChange={(event) => { setText(event.target.value); setAdjusting(false); }} placeholder="直接告诉 MyOS 你想做什么……" /></label>
        <div className="creation-type-row" role="tablist" aria-label="创建类型">{creationRegistry.map((item) => { const ItemIcon = iconMap[item.id]; return <button type="button" role="tab" aria-selected={type === item.id} className={type === item.id ? "active" : ""} onClick={() => chooseType(item.id)} key={item.id}><ItemIcon size={17} aria-hidden />{item.label}</button>; })}</div>
        {intent && !intent.type ? <section className="creation-choice"><strong>你想把它创建成什么？</strong><div>{creationRegistry.map((item) => <button className="text-button" type="button" key={item.id} onClick={() => chooseType(item.id)}>{item.label}</button>)}</div></section> : null}
        {intent?.projectCandidates.length && !intent.projectName ? <section className="creation-choice"><strong>找到多个相近项目，请选择关联方式。</strong><div><button className="text-button" type="button" onClick={() => { setDraft((current) => ({ ...current, project: "" })); setAdjusting(true); }}>不关联</button><button className="text-button" type="button" onClick={() => setAdjusting(true)}>重新选择</button><button className="text-button" type="button" onClick={() => chooseProject("__new_project__")}>新建项目</button></div></section> : null}
        <section className="creation-preview"><div className="creation-preview-heading"><span>MyOS 识别为</span><button className="text-button" type="button" onClick={() => setAdjusting((current) => !current)}>{adjusting ? "收起调整" : "调整"}</button></div><div className="creation-preview-title"><span><Icon size={18} aria-hidden /></span><div><b>{actionMap[type]}</b><strong>{activeDraft.title || "等待输入内容"}</strong></div></div>
          {type === "task" && adjusting ? <div className="creation-fields creation-task-fields"><label>关联项目<select value={activeDraft.project} onChange={(event) => chooseProject(event.target.value)}><option value="">不关联项目</option>{data.projects.map((item) => <option value={item.name} key={item.id}>{item.name}</option>)}<option value="__new_project__">新建项目…</option></select></label><label>计划日期<input type="date" value={activeDraft.plannedDate} onChange={(event) => setDraft((current) => ({ ...current, plannedDate: event.target.value }))} /></label><label>提醒时间<input type="time" value={activeDraft.reminderTime} onChange={(event) => setDraft((current) => ({ ...current, reminderTime: event.target.value }))} /></label><label>优先级<select value={activeDraft.priority} onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value as Draft["priority"] }))}><option value="high">高优先级</option><option value="medium">中优先级</option><option value="low">低优先级</option></select></label><label className="creation-checkbox"><input type="checkbox" checked={activeDraft.todayFocus} onChange={(event) => setDraft((current) => ({ ...current, todayFocus: event.target.checked }))} /> 标记为今日重点</label></div> : null}
          {type === "project" ? <div className="creation-fields"><label>项目类型<input value={activeDraft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} readOnly={!adjusting} /></label>{adjusting ? <label>下一步<input value={activeDraft.nextAction} onChange={(event) => setDraft((current) => ({ ...current, nextAction: event.target.value }))} /></label> : null}</div> : null}
          {type === "inbox" && adjusting ? <div className="creation-fields"><label>分类<input value={activeDraft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} /></label></div> : null}
        </section>
        {error ? <div className="form-error creation-error" role="alert"><span>{error}</span><button className="text-button" type="button" onClick={submit} disabled={saving}>重新尝试</button></div> : null}
        <footer><button className="primary-button" type="button" onClick={submit} disabled={saving || !activeDraft.title.trim()}>{saving ? "创建中…" : `创建${actionMap[type]}`}</button><button className="text-button" type="button" onClick={() => setAdjusting(true)}><ChevronDown size={15} aria-hidden />更多选项</button></footer>
      </>}
    </div>
  </div> : null}</CreationCenterContext.Provider>;
}
