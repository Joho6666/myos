import { useCallback, useEffect, useMemo, useState } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { CheckSquare, Cloud, Inbox, LoaderCircle, Play, Plus, RefreshCw } from "lucide-react";
import { currentSession, requestMagicLink, supabase } from "./auth";
import { queueAction, resolveConflict, todayTasks, type LocalState, type MobileInbox, type MobileProject, type MobileTask } from "./data";
import { getStorageStatus, loadLocalState, saveLocalState } from "./storage";
import { failedSync, fetchCachedExecutions, syncState } from "./sync";
import { ExecutionsScreen } from "./screens/executions-screen";
import { ListScreen } from "./screens/list-screen";
import { SyncStatus } from "./sync-status";

type Tab = "today" | "tasks" | "inbox" | "projects" | "executions";
const now = () => new Date().toISOString();
const makeTask = (title: string, projectId?: string): MobileTask => ({ id: crypto.randomUUID(), title, priority: "medium", projectId, status: "planned", todayFocus: true, updatedAt: now(), revision: 1 });

export function App() {
  const [state, setState] = useState<LocalState | null>(null);
  const [tab, setTab] = useState<Tab>("today");
  const [draft, setDraft] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("正在读取本地工作区…");
  const [syncing, setSyncing] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);

  useEffect(() => {
    void loadLocalState().then((value) => {
      setState(value);
      const storage = getStorageStatus();
      setMessage(navigator.onLine ? "本地数据已就绪。" : storage.lastError || "离线模式：数据仅保存在此设备。");
    });
    void currentSession().then((session) => setSessionEmail(session?.user.email || null));
  }, []);

  useEffect(() => {
    if (state) void saveLocalState(state);
  }, [state]);

  const sync = useCallback(async (current: LocalState) => {
    if (!navigator.onLine) {
      setOnline(false);
      setMessage("当前离线，操作已保存在手机。");
      return current;
    }
    setSyncing(true);
    try {
      const next = await syncState(current);
      const executions = await fetchCachedExecutions();
      const merged = { ...next, executions };
      setState(merged);
      setOnline(true);
      setMessage(merged.conflicts.length ? `发现 ${merged.conflicts.length} 个同步冲突，需要确认。` : "已与云端同步。");
      return merged;
    } catch (error) {
      const detail = error instanceof Error ? error.message : "同步失败，稍后会自动重试。";
      if (!detail.includes("登录")) {
        setState(failedSync(current));
      }
      setMessage(detail);
      return current;
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    function onOnline() {
      setOnline(true);
      setState((current) => {
        if (current) void sync(current);
        return current;
      });
    }
    function onOffline() {
      setOnline(false);
      setMessage("当前离线，操作已保存在手机。");
    }
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [sync]);

  useEffect(() => {
    if (!state?.nextRetryAt || !online || syncing) return;
    const wait = Math.max(0, state.nextRetryAt - Date.now());
    const timer = window.setTimeout(() => { void sync(state); }, wait);
    return () => window.clearTimeout(timer);
  }, [state, online, syncing, sync]);

  useEffect(() => {
    let handle: { remove: () => Promise<void> } | undefined;
    void CapacitorApp.addListener("appUrlOpen", async ({ url }) => {
      const hash = url.split("#")[1];
      if (!hash) return;
      const params = new URLSearchParams(hash);
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      if (supabase && access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
        const next = await currentSession();
        setSessionEmail(next?.user.email || null);
        setMessage("登录成功，可以同步。");
      }
    }).then((listener) => { handle = listener; });
    return () => { void handle?.remove(); };
  }, []);

  async function login() {
    try {
      await requestMagicLink(email);
      setMessage("登录链接已发送到邮箱，请在手机上打开。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "发送登录链接失败。");
    }
  }

  function apply(action: Parameters<typeof queueAction>[1]) {
    setState((current) => current ? queueAction(current, action) : current);
  }

  function create() {
    const title = draft.trim();
    if (!title || !state) return;
    if (tab === "projects") {
      const item: MobileProject = { id: crypto.randomUUID(), name: title, category: "个人", nextAction: "确定下一步", status: "active", updatedAt: now(), revision: 1 };
      apply({ type: "project.upsert", item });
    } else if (tab === "inbox") {
      const item: MobileInbox = { id: crypto.randomUUID(), title, type: "idea", category: "收件箱", status: "pending", updatedAt: now(), revision: 1 };
      apply({ type: "inbox.upsert", item });
    } else {
      apply({ type: "task.upsert", item: makeTask(title) });
    }
    setDraft("");
    setMessage(online ? "已保存到本地，等待同步。" : "已离线保存到手机。");
  }

  const focused = useMemo(() => state ? todayTasks(state) : [], [state]);
  if (!state) return <main className="boot"><LoaderCircle className="spin" /> 启动 MyOS 离线工作区…</main>;

  const composerHidden = tab === "executions";
  const rows = tab === "today" ? focused : tab === "tasks" ? state.data.tasks : tab === "inbox" ? state.data.inbox : state.data.projects;

  return (
    <main className="app">
      {!online ? <div className="offline-banner" role="status">离线 · 操作保存在本机，队列 {state.queue.length} 条</div> : null}
      <header>
        <div><strong>MyOS</strong><small>OFFLINE FIRST</small></div>
        <button className="sync" type="button" onClick={() => void sync(state)} disabled={syncing}>
          {syncing ? <LoaderCircle className="spin" size={17} /> : <RefreshCw size={17} />} 同步
        </button>
      </header>
      <section className="hero">
        <p>{new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(new Date())}</p>
        <h1>{tab === "today" ? "今天要推进什么？" : tab === "tasks" ? "任务" : tab === "inbox" ? "收件箱" : tab === "projects" ? "项目" : "执行"}</h1>
        <span>{online ? "本地优先，联网后自动同步。" : "当前离线，所有操作会安全保存在本机。"}</span>
      </section>
      {!composerHidden ? (
        <section className="composer">
          <input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => event.key === "Enter" && create()} placeholder={tab === "inbox" ? "记下一个想法…" : tab === "projects" ? "新项目名称…" : "添加一个任务…"} />
          <button type="button" onClick={create} aria-label="创建"><Plus size={21} /></button>
        </section>
      ) : null}
      {tab === "today" ? (
        <section className="summary">
          <div><b>{focused.length}</b><span>今日待办</span></div>
          <div><b>{state.data.projects.filter((item) => item.status === "active").length}</b><span>推进项目</span></div>
          <div><b>{state.data.inbox.filter((item) => item.status === "pending").length}</b><span>待整理</span></div>
        </section>
      ) : null}
      {tab === "executions" ? (
        <ExecutionsScreen executions={state.executions} online={online} />
      ) : tab === "today" || tab === "tasks" ? (
        <ListScreen title={tab === "today" ? "今日重点" : "全部任务"} rows={rows as MobileTask[]} kind="task" onToggleTask={(task) => apply({ type: "task.upsert", item: { ...task, status: task.status === "completed" ? "planned" : "completed", revision: task.revision + 1, updatedAt: now() } })} />
      ) : tab === "inbox" ? (
        <ListScreen title="等待整理" rows={state.data.inbox} kind="inbox" />
      ) : (
        <ListScreen title="正在推进" rows={state.data.projects} kind="project" />
      )}
      {state.conflicts.length > 0 ? (
        <section className="conflicts">
          <h2>需要确认的同步冲突</h2>
          {state.conflicts.map((conflict) => (
            <div key={conflict.id}>
              <span>{conflict.entity} 已在另一台设备修改</span>
              <button type="button" onClick={() => setState((current) => current ? resolveConflict(current, conflict.id, "local") : current)}>保留手机</button>
              <button type="button" onClick={() => setState((current) => current ? resolveConflict(current, conflict.id, "remote") : current)}>保留云端</button>
            </div>
          ))}
        </section>
      ) : null}
      <SyncStatus state={state} online={online} message={message} />
      {!sessionEmail ? (
        <section className="login">
          <strong>登录后同步到云端</strong>
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="你的邮箱" />
          <button type="button" onClick={() => void login()}>发送登录链接</button>
        </section>
      ) : null}
      <nav>
        <button className={tab === "today" ? "active" : ""} type="button" onClick={() => setTab("today")}><CheckSquare />今天</button>
        <button className={tab === "tasks" ? "active" : ""} type="button" onClick={() => setTab("tasks")}><CheckSquare />任务</button>
        <button className={tab === "inbox" ? "active" : ""} type="button" onClick={() => setTab("inbox")}><Inbox />收件箱</button>
        <button className={tab === "projects" ? "active" : ""} type="button" onClick={() => setTab("projects")}><Cloud />项目</button>
        <button className={tab === "executions" ? "active" : ""} type="button" onClick={() => setTab("executions")}><Play />执行</button>
      </nav>
    </main>
  );
}

