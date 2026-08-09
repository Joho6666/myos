"use client";

import { useEffect, useMemo, useState } from "react";
import { seedData } from "./seed";
import type { AgentWorkItem, DailyCheckin, DailyReview, FileRecord, Goal, Habit, HabitLog, InboxItem, LifeArea, MyOSData, Note, Project, Prompt, RoutineLog, Task, WeeklyReview } from "./models";
import type { MyOSAction } from "@/server/data/schemas";
import { postMyOSAction, publishMyOSData } from "./client-actions";

type ActionType = MyOSAction["type"];
type ActionPayload<TType extends ActionType> = Extract<MyOSAction, { type: TType }> extends { payload: infer TPayload }
  ? TPayload
  : undefined;

async function fetchMyOSData() {
  const response = await fetch("/api/myos/data", { cache: "no-store" });
  const body = await response.json().catch(() => null) as MyOSData | { error?: string } | null;

  if (!response.ok) {
    throw new Error((body as { error?: string } | null)?.error || "无法读取 MyOS 后端数据。");
  }

  return body as MyOSData;
}

const dataChangedEvent = "myos:data-changed";

export function useMyOSData() {
  const [data, setData] = useState<MyOSData>(seedData);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetchMyOSData()
      .then((next) => {
        if (active) {
          setData(next);
          setError(null);
        }
      })
      .catch((fetchError: unknown) => {
        if (active) {
          setError(fetchError instanceof Error ? fetchError.message : "读取后端数据失败。");
        }
      })
      .finally(() => {
        if (active) {
          setReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function onDataChanged(event: Event) {
      const detail = (event as CustomEvent<MyOSData>).detail;
      if (detail) {
        setData(detail);
        setError(null);
        setReady(true);
      }
    }

    window.addEventListener(dataChangedEvent, onDataChanged);
    return () => window.removeEventListener(dataChangedEvent, onDataChanged);
  }, []);

  async function mutate<TType extends ActionType>(type: TType, payload: ActionPayload<TType>) {
    setSaving(true);
    setError(null);

    try {
      const next = await postMyOSAction({ type, payload } as MyOSAction);
      setData(next);
      publishMyOSData(next);
      return true;
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "保存失败。");
      return false;
    } finally {
      setSaving(false);
    }
  }

  return useMemo(
    () => ({
      data,
      ready,
      saving,
      error,
      addProject(input: Pick<Project, "name" | "category" | "nextAction"> & { goalId?: string }) {
        return mutate("addProject", input);
      },
      updateProject(input: Pick<Project, "id" | "name" | "category" | "nextAction" | "status" | "favorite"> & { goalId?: string }) {
        return mutate("updateProject", input);
      },
      deleteProject(id: string) {
        return mutate("deleteProject", { id });
      },
      updateProjectAgentProfile(input: { projectId: string; summary: string; techStack: string[]; progressMode: "manual" | "agent_work"; manualProgress: number }) {
        return mutate("updateProjectAgentProfile", input);
      },
      addProjectMilestone(input: { projectId: string; title: string; description: string; status: "planned" | "in_progress" | "completed" | "blocked"; targetDate?: string; progress: number }) {
        return mutate("addProjectMilestone", input);
      },
      updateProjectMilestone(input: { id: string; title: string; description: string; status: "planned" | "in_progress" | "completed" | "blocked"; targetDate?: string; progress: number }) {
        return mutate("updateProjectMilestone", input);
      },
      deleteProjectMilestone(id: string) {
        return mutate("deleteProjectMilestone", { id });
      },
      addProjectRisk(input: { projectId: string; title: string; severity: "low" | "medium" | "high"; status: "open" | "mitigated" | "accepted"; mitigation: string }) {
        return mutate("addProjectRisk", input);
      },
      updateProjectRisk(input: { id: string; title: string; severity: "low" | "medium" | "high"; status: "open" | "mitigated" | "accepted"; mitigation: string }) {
        return mutate("updateProjectRisk", input);
      },
      deleteProjectRisk(id: string) {
        return mutate("deleteProjectRisk", { id });
      },
      assignProjectAgent(input: { projectId: string; agentId: "codex" | "claude-code" | "opencode" | "hermes" | "openclaw"; role: string }) {
        return mutate("assignProjectAgent", input);
      },
      addAgentWorkItem(input: { projectId: string; agentId: "codex" | "claude-code" | "opencode" | "hermes" | "openclaw"; title: string; instructions: string }) {
        return mutate("addAgentWorkItem", input);
      },
      updateAgentWorkItem(input: Pick<AgentWorkItem, "id" | "status" | "progress"> & Partial<Pick<AgentWorkItem, "blockedReason" | "result" | "changedFiles" | "testResult" | "artifactUrl">> & { eventMessage?: string }) {
        return mutate("updateAgentWorkItem", input);
      },
      addAgentReport(input: { projectId: string; workItemId?: string; agentId: "codex" | "claude-code" | "opencode" | "hermes" | "openclaw"; summary: string; progress: number; status?: AgentWorkItem["status"]; blockedReason?: string; changedFiles?: string[]; testResult?: string; artifactUrl?: string }) {
        return mutate("addAgentReport", input);
      },
      toggleTask(id: string) {
        return mutate("toggleTask", { id });
      },
      addTask(input: Pick<Task, "title" | "priority" | "project" | "goalId" | "due" | "plannedDate" | "todayFocus">) {
        return mutate("addTask", input);
      },
      updateTask(input: Pick<Task, "id" | "title" | "priority" | "project" | "goalId" | "due" | "plannedDate" | "todayFocus" | "status">) {
        return mutate("updateTask", input);
      },
      deleteTask(id: string) {
        return mutate("deleteTask", { id });
      },
      addInbox(input: Pick<InboxItem, "title" | "type" | "category">) {
        return mutate("addInbox", input);
      },
      updateInbox(input: Pick<InboxItem, "id" | "title" | "type" | "category" | "status">) {
        return mutate("updateInbox", input);
      },
      deleteInbox(id: string) {
        return mutate("deleteInbox", { id });
      },
      addPrompt(input: Pick<Prompt, "title" | "category" | "content">) {
        return mutate("addPrompt", input);
      },
      updatePrompt(input: Pick<Prompt, "id" | "title" | "category" | "content" | "favorite">) {
        return mutate("updatePrompt", input);
      },
      deletePrompt(id: string) {
        return mutate("deletePrompt", { id });
      },
      addNote(input: Pick<Note, "title" | "type" | "summary">) {
        return mutate("addNote", input);
      },
      updateNote(input: Pick<Note, "id" | "title" | "type" | "summary" | "favorite">) {
        return mutate("updateNote", input);
      },
      deleteNote(id: string) {
        return mutate("deleteNote", { id });
      },
      addFileRecord(input: Pick<FileRecord, "name" | "kind" | "project" | "size">) {
        return mutate("addFileRecord", input);
      },
      deleteFile(id: string) {
        return mutate("deleteFile", { id });
      },
      addLifeArea(input: Pick<LifeArea, "name" | "description" | "icon" | "privacyLevel">) {
        return mutate("addLifeArea", input);
      },
      updateLifeAreaStatus(id: string, status: LifeArea["status"]) {
        return mutate("updateLifeAreaStatus", { id, status });
      },
      addGoal(input: Pick<Goal, "lifeAreaId" | "title" | "description" | "motivation" | "successCriteria" | "priority" | "targetDate" | "nextAction" | "progressMode" | "privacyLevel">) {
        return mutate("addGoal", input);
      },
      updateGoalProgress(id: string, manualProgress: number, progressMode: Goal["progressMode"]) {
        return mutate("updateGoalProgress", { id, manualProgress, progressMode });
      },
      addHabit(input: Pick<Habit, "name" | "description" | "lifeAreaId" | "goalId" | "frequencyType" | "targetValue" | "unit" | "reminderTime" | "privacyLevel">) {
        return mutate("addHabit", input);
      },
      logHabit(habitId: string, status: HabitLog["status"], value?: number, note?: string) {
        return mutate("logHabit", { habitId, status, value, note });
      },
      logRoutine(routineId: string, completedStepIds: string[], status: RoutineLog["status"]) {
        return mutate("logRoutine", { routineId, completedStepIds, status });
      },
      saveDailyCheckin(input: Omit<DailyCheckin, "id" | "updatedAt" | "privacyLevel">) {
        return mutate("saveDailyCheckin", input);
      },
      saveDailyReview(input: Omit<DailyReview, "id" | "updatedAt" | "privacyLevel">) {
        return mutate("saveDailyReview", input);
      },
      saveWeeklyReview(input: Omit<WeeklyReview, "id" | "updatedAt" | "privacyLevel">) {
        return mutate("saveWeeklyReview", input);
      },
      resetData() {
        return mutate("resetData", undefined);
      }
    }),
    [data, ready, saving, error]
  );
}
