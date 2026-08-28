"use client";

import { useState } from "react";
import { ProjectList } from "@/features/projects/project-list";
import { ProjectQuickCreate } from "@/features/projects/project-quick-create";
import { postMyOSAction, publishMyOSData } from "@/lib/data/client-actions";
import type { Project } from "@/lib/data/models";
import { useMyOSData } from "@/lib/data/store";
import Link from "next/link";

export default function ProjectsPage() {
  const { data } = useMyOSData();
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function createProject(input: Pick<Project, "name" | "category" | "nextAction"> & { goalId?: string }): Promise<Project | undefined> {
    setBusy("create");
    setMessage("");
    setError("");
    try {
      const previousProjectIds = new Set(data.projects.map((project) => project.id));
      const next = await postMyOSAction({ type: "addProject", payload: input });
      publishMyOSData(next);
      setMessage(`「${input.name}」已创建。`);
      return next.projects.find((project) => !previousProjectIds.has(project.id));
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "创建项目失败。");
      throw createError;
    } finally {
      setBusy("");
    }
  }

  async function updateProject(input: Pick<Project, "id" | "name" | "category" | "nextAction" | "status" | "favorite"> & { goalId?: string }) {
    setBusy(input.id);
    setMessage("");
    setError("");
    try {
      const next = await postMyOSAction({ type: "updateProject", payload: input });
      publishMyOSData(next);
      setMessage(`「${input.name}」已更新。`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "更新项目失败。");
      throw updateError;
    } finally {
      setBusy("");
    }
  }

  async function deleteProject(project: Project) {
    setBusy(project.id);
    setMessage("");
    setError("");
    try {
      const next = await postMyOSAction({ type: "deleteProject", payload: { id: project.id } });
      publishMyOSData(next);
      setMessage(`「${project.name}」已删除。`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除项目失败。");
      throw deleteError;
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>项目中心</h1>
          <p>像收件箱一样快速创建项目，之后再补充路径、任务和资料。</p>
        </div>
        <Link className="primary-button" href="/app/projects/new">+ 开始项目</Link>
      </div>
      {message ? <p className="config-message">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      <div className="project-workspace">
        <ProjectQuickCreate goals={data.goals} saving={busy === "create"} onCreate={createProject} />
        <ProjectList projects={data.projects} goals={data.goals} busy={busy} onUpdate={updateProject} onDelete={deleteProject} />
      </div>
    </>
  );
}
