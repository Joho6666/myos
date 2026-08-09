"use client";

import Link from "next/link";
import { Archive, Pencil, Search, Star, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { Goal, Project, Status } from "@/lib/data/models";

type ProjectListProps = {
  projects: Project[];
  goals: Goal[];
  busy: string;
  onUpdate: (input: Pick<Project, "id" | "name" | "category" | "nextAction" | "status" | "favorite"> & { goalId?: string }) => Promise<void>;
  onDelete: (project: Project) => Promise<void>;
};

const viewOptions = [
  { id: "active", label: "进行中" },
  { id: "favorite", label: "收藏" },
  { id: "all", label: "全部" }
] as const;

export function ProjectList({ projects, goals, busy, onUpdate, onDelete }: ProjectListProps) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<(typeof viewOptions)[number]["id"]>("active");
  const [editingId, setEditingId] = useState("");
  const [draft, setDraft] = useState({ name: "", category: "", nextAction: "", status: "active" as Status, favorite: false, goalId: "" });
  const goalById = useMemo(() => new Map(goals.map((goal) => [goal.id, goal.title])), [goals]);
  const visibleProjects = projects.filter((project) => {
    const searchable = `${project.name} ${project.category} ${project.nextAction}`.toLowerCase();
    const matchesQuery = searchable.includes(query.trim().toLowerCase());
    const matchesView =
      view === "all" ||
      (view === "favorite" && project.favorite) ||
      (view === "active" && project.status !== "archived" && project.status !== "done");

    return matchesQuery && matchesView;
  });

  function startEdit(project: Project) {
    setEditingId(project.id);
    setDraft({
      name: project.name,
      category: project.category,
      nextAction: project.nextAction,
      status: project.status,
      favorite: project.favorite,
      goalId: project.goalId || ""
    });
  }

  function projectPayload(project: Project, patch: Partial<Pick<Project, "name" | "category" | "nextAction" | "status" | "favorite" | "goalId">> = {}) {
    return {
      id: project.id,
      name: patch.name ?? project.name,
      category: patch.category ?? project.category,
      nextAction: patch.nextAction ?? project.nextAction,
      status: patch.status ?? project.status,
      favorite: patch.favorite ?? project.favorite,
      goalId: patch.goalId ?? project.goalId
    };
  }

  async function saveEdit(id: string) {
    if (!draft.name.trim() || !draft.category.trim() || !draft.nextAction.trim()) return;
    try {
      await onUpdate({ id, ...draft, goalId: draft.goalId || undefined });
      setEditingId("");
    } catch {
      // Parent page keeps the backend error visible and the editor open for retry.
    }
  }

  async function runUpdate(project: Project, patch: Partial<Pick<Project, "status" | "favorite">>) {
    try {
      await onUpdate(projectPayload(project, patch));
    } catch {
      // Parent page renders the real error.
    }
  }

  async function runDelete(project: Project) {
    if (!window.confirm(`确定删除「${project.name}」吗？`)) return;
    try {
      await onDelete(project);
    } catch {
      // Parent page renders the real error.
    }
  }

  return (
    <section className="panel project-list-panel" aria-labelledby="project-list-heading">
      <div className="project-list-toolbar">
        <div>
          <h2 id="project-list-heading">项目</h2>
          <p>{visibleProjects.length} 个匹配项目</p>
        </div>
        <div className="project-view-tabs" aria-label="项目视图">
          {viewOptions.map((option) => (
            <button className={view === option.id ? "active" : ""} key={option.id} type="button" onClick={() => setView(option.id)}>
              {option.label}
            </button>
          ))}
        </div>
        <label className="project-search">
          <Search size={16} aria-hidden />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索项目、类型或下一步" />
        </label>
      </div>

      <div className="project-list">
        {visibleProjects.map((project) => (
          <div className="project-row" key={project.id}>
            {editingId === project.id ? (
              <>
                <div className="project-row-main">
                  <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
                  <input value={draft.nextAction} onChange={(event) => setDraft((current) => ({ ...current, nextAction: event.target.value }))} />
                </div>
                <div className="project-row-meta">
                  <input value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} />
                  <select value={draft.goalId} onChange={(event) => setDraft((current) => ({ ...current, goalId: event.target.value }))}>
                    <option value="">未关联目标</option>
                    {goals.map((goal) => <option value={goal.id} key={goal.id}>{goal.title}</option>)}
                  </select>
                  <select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as Status }))}>
                    <option value="planned">planned</option>
                    <option value="active">active</option>
                    <option value="paused">paused</option>
                    <option value="done">done</option>
                    <option value="archived">archived</option>
                  </select>
                  <button className="text-button" type="button" disabled={busy === project.id} onClick={() => void saveEdit(project.id)}>{busy === project.id ? "保存中" : "保存"}</button>
                  <button className="text-button" type="button" disabled={busy === project.id} onClick={() => setEditingId("")}>取消</button>
                </div>
              </>
            ) : (
              <>
                <Link className="project-row-main" href={`/app/projects/${project.id}`}>
                  <strong>{project.name}</strong>
                  <span>{project.nextAction}</span>
                </Link>
                <div className="project-row-meta">
                  <span>{project.category}</span>
                  <span>{project.goalId ? goalById.get(project.goalId) || "目标" : "未关联目标"}</span>
                  <span className={`badge ${project.status}`}>{project.status}</span>
                  <span>{project.updatedAt}</span>
                  <button className="icon-button" type="button" disabled={busy === project.id} aria-label="收藏项目" onClick={() => void runUpdate(project, { favorite: !project.favorite })}><Star size={15} aria-hidden /></button>
                  <button className="icon-button" type="button" disabled={busy === project.id} aria-label="编辑项目" onClick={() => startEdit(project)}><Pencil size={15} aria-hidden /></button>
                  <button className="icon-button" type="button" disabled={busy === project.id} aria-label="归档项目" onClick={() => void runUpdate(project, { status: "archived" })}><Archive size={15} aria-hidden /></button>
                  <button className="icon-button" type="button" disabled={busy === project.id} aria-label="删除项目" onClick={() => void runDelete(project)}><Trash2 size={15} aria-hidden /></button>
                </div>
              </>
            )}
          </div>
        ))}
        {!visibleProjects.length ? <div className="empty-state">没有匹配项目。换个关键词，或先用上方快速创建。</div> : null}
      </div>
    </section>
  );
}
