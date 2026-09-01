import { describe, expect, it } from "vitest";
import { seedData } from "@/lib/data/seed";
import { applyMyOSAction, MyOSActionError } from "./actions";
import { nextOccurrenceDate } from "./date-utils";

describe("nextOccurrenceDate", () => {
  it("advances daily, weekly, and monthly rules", () => {
    expect(nextOccurrenceDate("daily", "2026-08-17")).toBe("2026-08-18");
    expect(nextOccurrenceDate("weekly", "2026-08-17")).toBe("2026-08-24");
    expect(nextOccurrenceDate("monthly", "2026-08-31")).toBe("2026-09-30");
    expect(nextOccurrenceDate("monthly", "2026-01-31")).toBe("2026-02-28");
  });

  it("skips weekends for weekday rules", () => {
    // 2026-08-21 是周五，下一轮应跳过周末到周一
    expect(nextOccurrenceDate("weekdays", "2026-08-21")).toBe("2026-08-24");
    expect(nextOccurrenceDate("weekdays", "2026-08-22")).toBe("2026-08-24");
  });

  it("resolves the today alias and rejects invalid input", () => {
    expect(nextOccurrenceDate("daily", "today", new Date("2026-08-17T02:00:00Z"))).toBe("2026-08-18");
    expect(nextOccurrenceDate("hourly", "2026-08-17")).toBeNull();
    expect(nextOccurrenceDate("daily", "not-a-date")).toBeNull();
  });
});

describe("applyMyOSAction recurring tasks", () => {
  it("spawns the next occurrence when completing a recurring task", () => {
    const created = applyMyOSAction(seedData, {
      type: "addTask",
      payload: {
        title: "晚间复盘",
        priority: "medium",
        plannedDate: "today",
        todayFocus: false,
        recurrenceRule: "daily"
      }
    });
    const task = created.tasks[0]!;
    expect(task.recurrenceRule).toBe("daily");

    const completed = applyMyOSAction(created, { type: "toggleTask", payload: { id: task.id } });

    const original = completed.tasks.find((item) => item.id === task.id)!;
    expect(original.done).toBe(true);
    expect(original.status).toBe("completed");
    expect(original.recurrenceRule).toBeUndefined();

    const nextTask = completed.tasks.find((item) => item.id !== task.id && item.title === "晚间复盘")!;
    expect(nextTask.done).toBe(false);
    expect(nextTask.status).toBe("planned");
    expect(nextTask.recurrenceRule).toBe("daily");
    expect(nextTask.plannedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(completed.activities[0]?.action).toBe("完成重复任务");
  });

  it("does not respawn a recurring task when un-completing it", () => {
    const created = applyMyOSAction(seedData, {
      type: "addTask",
      payload: { title: "周报", priority: "low", plannedDate: "2026-08-17", recurrenceRule: "weekly" }
    });
    const task = created.tasks[0]!;

    const completed = applyMyOSAction(created, { type: "toggleTask", payload: { id: task.id } });
    const reopened = applyMyOSAction(completed, { type: "toggleTask", payload: { id: task.id } });

    const original = reopened.tasks.find((item) => item.id === task.id)!;
    expect(original.done).toBe(false);
    expect(reopened.tasks.filter((item) => item.title === "周报")).toHaveLength(2);
  });

  it("keeps plain toggling for tasks without a recurrence rule", () => {
    const task = seedData.tasks[0]!;
    const toggled = applyMyOSAction(seedData, { type: "toggleTask", payload: { id: task.id } });

    expect(toggled.tasks).toHaveLength(seedData.tasks.length);
    expect(toggled.tasks.find((item) => item.id === task.id)?.done).toBe(true);
  });
});

describe("agent execution records", () => {
  it("stores an execution snapshot without dropping existing work items", () => {
    const next = applyMyOSAction(seedData, {
      type: "upsertAgentExecution",
      payload: {
        id: "exec-demo",
        workItemId: "agent-work-1",
        projectId: "project-myos",
        projectName: "MyOS 私人工作台",
        agentId: "codex",
        title: "检查 TypeScript",
        instructions: "修复错误并运行测试",
        workingDirectory: "C:/demo/myos",
        permissionProfile: "standard",
        status: "running",
        phase: "running",
        latestAction: "codex exec started"
      }
    });
    expect(next.agentExecutions[0]?.id).toBe("exec-demo");
    expect(next.agentWorkItems).toHaveLength(seedData.agentWorkItems.length);
    expect(next.activities[0]?.action).toBe("Agent 执行");
  });
});

describe("applyMyOSAction", () => {
  it("creates a project and records activity", () => {
    const next = applyMyOSAction(seedData, {
      type: "addProject",
      payload: {
        name: "后端数据层",
        category: "AI开发",
        nextAction: "检查 API"
      }
    });

    expect(next.projects[0]?.name).toBe("后端数据层");
    expect(next.activities[0]?.action).toBe("创建项目");
  });

  it("limits today focus tasks to three active items", () => {
    const next = applyMyOSAction(seedData, {
      type: "addTask",
      payload: {
        title: "第四个今日重点",
        priority: "medium",
        due: "今天",
        plannedDate: "today",
        todayFocus: true
      }
    });

    expect(next.tasks[0]?.todayFocus).toBe(false);
  });

  it("updates and deletes a project", () => {
    const project = seedData.projects[0]!;
    const updated = applyMyOSAction(seedData, {
      type: "updateProject",
      payload: {
        id: project.id,
        name: "MyOS 已维护项目",
        category: project.category,
        nextAction: "验证编辑",
        status: "paused",
        favorite: true,
        goalId: project.goalId
      }
    });

    expect(updated.projects.find((item) => item.id === project.id)?.name).toBe("MyOS 已维护项目");
    expect(updated.activities[0]?.action).toBe("更新项目");

    const deleted = applyMyOSAction(updated, { type: "deleteProject", payload: { id: project.id } });
    expect(deleted.projects.some((item) => item.id === project.id)).toBe(false);
  });

  it("updates and deletes a task", () => {
    const task = seedData.tasks[0]!;
    const updated = applyMyOSAction(seedData, {
      type: "updateTask",
      payload: {
        id: task.id,
        title: "补全文档结构 - 已编辑",
        priority: "high",
        project: task.project,
        goalId: task.goalId,
        due: "今晚",
        plannedDate: "today",
        todayFocus: false,
        status: "in_progress"
      }
    });

    expect(updated.tasks.find((item) => item.id === task.id)?.title).toBe("补全文档结构 - 已编辑");
    expect(updated.activities[0]?.action).toBe("更新任务");

    const deleted = applyMyOSAction(updated, { type: "deleteTask", payload: { id: task.id } });
    expect(deleted.tasks.some((item) => item.id === task.id)).toBe(false);
  });

  it("rejects updates and deletes for missing records", () => {
    expect(() => applyMyOSAction(seedData, {
      type: "updateProject",
      payload: {
        id: "missing-project",
        name: "不存在项目",
        category: "AI开发",
        nextAction: "不应保存",
        status: "active",
        favorite: false
      }
    })).toThrow(MyOSActionError);

    expect(() => applyMyOSAction(seedData, {
      type: "deleteTask",
      payload: { id: "missing-task" }
    })).toThrow("任务不存在或已被删除。");
  });

  it("updates and deletes inbox, prompt, and note items", () => {
    const inbox = seedData.inbox[0]!;
    const prompt = seedData.prompts[0]!;
    const note = seedData.notes[0]!;

    const updatedInbox = applyMyOSAction(seedData, {
      type: "updateInbox",
      payload: { id: inbox.id, title: "已分类收件箱", type: "idea", category: "开发", status: "classified" }
    });
    expect(updatedInbox.inbox.find((item) => item.id === inbox.id)?.status).toBe("classified");

    const updatedPrompt = applyMyOSAction(updatedInbox, {
      type: "updatePrompt",
      payload: { id: prompt.id, title: "已编辑提示词", category: prompt.category, content: prompt.content, favorite: false }
    });
    expect(updatedPrompt.prompts.find((item) => item.id === prompt.id)?.title).toBe("已编辑提示词");

    const updatedNote = applyMyOSAction(updatedPrompt, {
      type: "updateNote",
      payload: { id: note.id, title: "已编辑知识", type: note.type, summary: note.summary, favorite: true }
    });
    expect(updatedNote.notes.find((item) => item.id === note.id)?.favorite).toBe(true);

    const deletedInbox = applyMyOSAction(updatedNote, { type: "deleteInbox", payload: { id: inbox.id } });
    const deletedPrompt = applyMyOSAction(deletedInbox, { type: "deletePrompt", payload: { id: prompt.id } });
    const deletedNote = applyMyOSAction(deletedPrompt, { type: "deleteNote", payload: { id: note.id } });

    expect(deletedNote.inbox.some((item) => item.id === inbox.id)).toBe(false);
    expect(deletedNote.prompts.some((item) => item.id === prompt.id)).toBe(false);
    expect(deletedNote.notes.some((item) => item.id === note.id)).toBe(false);
  });

  it("tracks Agent work and reports against a project", () => {
    const project = seedData.projects[0]!;
    const withAssignment = applyMyOSAction(seedData, {
      type: "assignProjectAgent",
      payload: { projectId: project.id, agentId: "opencode", role: "实现辅助" }
    });
    const withWork = applyMyOSAction(withAssignment, {
      type: "addAgentWorkItem",
      payload: { projectId: project.id, agentId: "opencode", title: "实现项目摘要", instructions: "读取项目上下文后完成组件。" }
    });
    const workItem = withWork.agentWorkItems[0]!;
    const updated = applyMyOSAction(withWork, {
      type: "addAgentReport",
      payload: { projectId: project.id, workItemId: workItem.id, agentId: "opencode", summary: "完成摘要组件。", progress: 80 }
    });

    expect(updated.agentAssignments.some((item) => item.agentId === "opencode")).toBe(true);
    expect(updated.agentWorkItems.find((item) => item.id === workItem.id)?.progress).toBe(80);
    expect(updated.agentReports[0]?.summary).toBe("完成摘要组件。");
  });

  it("tracks delivery milestones, risks, and Agent evidence", () => {
    const project = seedData.projects[0]!;
    const withMilestone = applyMyOSAction(seedData, {
      type: "addProjectMilestone",
      payload: {
        projectId: project.id,
        title: "验证交付闭环",
        description: "确认 Agent 报告和测试证据可以追溯。",
        status: "in_progress",
        targetDate: "2026-08-20",
        progress: 40
      }
    });
    const milestone = withMilestone.projectMilestones[0]!;
    const withRisk = applyMyOSAction(withMilestone, {
      type: "addProjectRisk",
      payload: {
        projectId: project.id,
        title: "外部连接未配置",
        severity: "high",
        status: "open",
        mitigation: "先完成连接测试，再启用自动同步。"
      }
    });
    const withWork = applyMyOSAction(withRisk, {
      type: "addAgentWorkItem",
      payload: { projectId: project.id, agentId: "codex", title: "补充交付证据", instructions: "运行检查并提交变更文件。" }
    });
    const workItem = withWork.agentWorkItems[0]!;
    const updated = applyMyOSAction(withWork, {
      type: "addAgentReport",
      payload: {
        projectId: project.id,
        workItemId: workItem.id,
        agentId: "codex",
        summary: "已提交交付证据。",
        progress: 75,
        status: "in_progress",
        changedFiles: ["src/server/data/actions.ts"],
        testResult: "pnpm test 通过"
      }
    });

    expect(updated.projectMilestones.find((item) => item.id === milestone.id)?.progress).toBe(40);
    expect(updated.projectRisks[0]?.severity).toBe("high");
    expect(updated.agentWorkItems.find((item) => item.id === workItem.id)?.testResult).toBe("pnpm test 通过");
    expect(updated.agentWorkEvents[0]?.eventType).toBe("report");
  });
});
