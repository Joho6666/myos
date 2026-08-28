"use client";

import { useState } from "react";
import { ProjectList } from "@/features/projects/project-list";
import { postMyOSAction, publishMyOSData } from "@/lib/data/client-actions";
import type { Project } from "@/lib/data/models";
import { useMyOSData } from "@/lib/data/store";
import { useCreationCenter } from "@/features/creation/creation-context";

export default function ProjectsPage() {
  const { data } = useMyOSData();
  const { openCreation } = useCreationCenter();
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
        <button className="primary-button" type="button" onClick={(event) => openCreation({ type: "project", trigger: event.currentTarget })}>+ 开始项目</button>
      </div>
      {message ? <p className="config-message">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      <div className="project-workspace">
        <ProjectList projects={data.projects} goals={data.goals} busy={busy} onUpdate={updateProject} onDelete={deleteProject} />
      </div>
    </>
  );
}
