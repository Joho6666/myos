import { randomUUID } from "node:crypto";
import type { Activity, AgentAssignment, AgentReport, AgentWorkItem, DailyCheckin, DailyReview, Goal, Habit, HabitLog, InboxItem, LifeArea, MyOSData, Note, Project, Prompt, RoutineLog, Task, WeeklyReview } from "@/lib/data/models";
import { seedData } from "@/lib/data/seed";
import { nextOccurrenceDate, todayDateKey } from "./date-utils";
import type { MyOSAction } from "./schemas";
import type { AgentWorkEvent, ProjectMilestone, ProjectRisk } from "@/lib/data/models";

export class MyOSActionError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
  }
}

function todayKey() {
  return "today";
}


function logActivity(action: string, detail: string, result: Activity["result"] = "success"): Activity {
  return { id: randomUUID(), action, detail: detail.slice(0, 200), time: "刚刚", result };
}

function requireItem<T>(item: T | undefined, label: string): T {
  if (!item) {
    throw new MyOSActionError(`${label}不存在或已被删除。`, 404);
  }
  return item;
}

export function applyMyOSAction(current: MyOSData, action: MyOSAction): MyOSData {
  switch (action.type) {
    case "addProject": {
      const project: Project = {
        id: randomUUID(),
        goalId: action.payload.goalId,
        name: action.payload.name,
        category: action.payload.category,
        status: "active",
        path: "~/dev/new-project",
        nextAction: action.payload.nextAction,
        updatedAt: "刚刚",
        favorite: false,
        summary: "",
        techStack: [],
        progressMode: "agent_work",
        manualProgress: 0
      };
      return {
        ...current,
        projects: [project, ...current.projects],
        activities: [logActivity("创建项目", project.name), ...current.activities]
      };
    }
    case "updateProject": {
      requireItem(current.projects.find((project) => project.id === action.payload.id), "项目");
      return {
        ...current,
        projects: current.projects.map((project) =>
          project.id === action.payload.id
            ? {
                ...project,
                goalId: action.payload.goalId,
                name: action.payload.name,
                category: action.payload.category,
                status: action.payload.status,
                nextAction: action.payload.nextAction,
                favorite: action.payload.favorite,
                updatedAt: "刚刚"
              }
            : project
        ),
        activities: [logActivity("更新项目", action.payload.name), ...current.activities]
      };
    }
    case "deleteProject": {
      const project = requireItem(current.projects.find((item) => item.id === action.payload.id), "项目");
      return {
        ...current,
        projects: current.projects.filter((item) => item.id !== action.payload.id),
        projectMilestones: current.projectMilestones.filter((item) => item.projectId !== project.id),
        projectRisks: current.projectRisks.filter((item) => item.projectId !== project.id),
        agentAssignments: current.agentAssignments.filter((item) => item.projectId !== project.id),
        agentWorkItems: current.agentWorkItems.filter((item) => item.projectId !== project.id),
        agentReports: current.agentReports.filter((item) => item.projectId !== project.id),
        agentWorkEvents: current.agentWorkEvents.filter((item) => item.projectId !== project.id),
        agentExecutions: current.agentExecutions.filter((item) => item.projectId !== project.id),
        activities: [logActivity("删除项目", project.name), ...current.activities]
      };
    }
    case "updateProjectAgentProfile": {
      requireItem(current.projects.find((project) => project.id === action.payload.projectId), "项目");
      return {
        ...current,
        projects: current.projects.map((project) => project.id === action.payload.projectId
          ? {
              ...project,
              summary: action.payload.summary,
              techStack: action.payload.techStack,
              progressMode: action.payload.progressMode,
              manualProgress: action.payload.manualProgress,
              preferredAgent: action.payload.preferredAgent ?? project.preferredAgent,
              fallbackAgent: action.payload.fallbackAgent ?? project.fallbackAgent,
              permissionProfile: action.payload.permissionProfile ?? project.permissionProfile,
              maxRuntimeMinutes: action.payload.maxRuntimeMinutes ?? project.maxRuntimeMinutes,
              autoRetry: action.payload.autoRetry ?? project.autoRetry,
              verification: action.payload.verification ?? project.verification,
              updatedAt: "刚刚"
            }
          : project),
        activities: [logActivity("更新项目 Agent 配置", action.payload.projectId), ...current.activities]
      };
    }
    case "addProjectMilestone": {
      const project = requireItem(current.projects.find((item) => item.id === action.payload.projectId), "项目");
      const milestone: ProjectMilestone = { id: randomUUID(), ...action.payload, targetDate: action.payload.targetDate || undefined, updatedAt: "刚刚" };
      return { ...current, projectMilestones: [milestone, ...current.projectMilestones], activities: [logActivity("创建项目里程碑", `${project.name} / ${milestone.title}`), ...current.activities] };
    }
    case "updateProjectMilestone": {
      const milestone = requireItem(current.projectMilestones.find((item) => item.id === action.payload.id), "项目里程碑");
      return {
        ...current,
        projectMilestones: current.projectMilestones.map((item) => item.id === milestone.id ? { ...item, ...action.payload, targetDate: action.payload.targetDate || undefined, updatedAt: "刚刚" } : item),
        activities: [logActivity("更新项目里程碑", action.payload.title), ...current.activities]
      };
    }
    case "deleteProjectMilestone": {
      const milestone = requireItem(current.projectMilestones.find((item) => item.id === action.payload.id), "项目里程碑");
      return { ...current, projectMilestones: current.projectMilestones.filter((item) => item.id !== milestone.id), activities: [logActivity("删除项目里程碑", milestone.title), ...current.activities] };
    }
    case "addProjectRisk": {
      const project = requireItem(current.projects.find((item) => item.id === action.payload.projectId), "项目");
      const risk: ProjectRisk = { id: randomUUID(), ...action.payload, updatedAt: "刚刚" };
      return { ...current, projectRisks: [risk, ...current.projectRisks], activities: [logActivity("记录项目风险", `${project.name} / ${risk.title}`, risk.severity === "high" ? "warning" : "success"), ...current.activities] };
    }
    case "updateProjectRisk": {
      const risk = requireItem(current.projectRisks.find((item) => item.id === action.payload.id), "项目风险");
      return {
        ...current,
        projectRisks: current.projectRisks.map((item) => item.id === risk.id ? { ...item, ...action.payload, updatedAt: "刚刚" } : item),
        activities: [logActivity("更新项目风险", action.payload.title), ...current.activities]
      };
    }
    case "deleteProjectRisk": {
      const risk = requireItem(current.projectRisks.find((item) => item.id === action.payload.id), "项目风险");
      return { ...current, projectRisks: current.projectRisks.filter((item) => item.id !== risk.id), activities: [logActivity("删除项目风险", risk.title), ...current.activities] };
    }
    case "assignProjectAgent": {
      requireItem(current.projects.find((project) => project.id === action.payload.projectId), "项目");
      const existing = current.agentAssignments.find((item) => item.projectId === action.payload.projectId && item.agentId === action.payload.agentId);
      const assignment: AgentAssignment = existing
        ? { ...existing, role: action.payload.role, createdAt: "刚刚" }
        : { id: randomUUID(), projectId: action.payload.projectId, agentId: action.payload.agentId, role: action.payload.role, createdAt: "刚刚" };
      return {
        ...current,
        agentAssignments: existing ? current.agentAssignments.map((item) => item.id === existing.id ? assignment : item) : [assignment, ...current.agentAssignments],
        activities: [logActivity("分配 Agent", `${action.payload.agentId} / ${action.payload.role}`), ...current.activities]
      };
    }
    case "addAgentWorkItem": {
      requireItem(current.projects.find((project) => project.id === action.payload.projectId), "项目");
      const workItem: AgentWorkItem = { id: randomUUID(), ...action.payload, status: "queued", progress: 0, updatedAt: "刚刚", failureCount: 0 };
      const event: AgentWorkEvent = { id: randomUUID(), projectId: workItem.projectId, workItemId: workItem.id, agentId: workItem.agentId, eventType: "queued", progress: 0, message: "工作项已加入 Agent 队列。", createdAt: "刚刚" };
      return {
        ...current,
        agentWorkItems: [workItem, ...current.agentWorkItems],
        agentWorkEvents: [event, ...current.agentWorkEvents],
        activities: [logActivity("创建 Agent 工作项", workItem.title), ...current.activities]
      };
    }
    case "updateAgentWorkItem": {
      const workItem = requireItem(current.agentWorkItems.find((item) => item.id === action.payload.id), "Agent 工作项");
      const progress = action.payload.status === "completed" ? 100 : action.payload.progress;
      const eventType: AgentWorkEvent["eventType"] = action.payload.status === "completed" ? "completed" : action.payload.status === "blocked" ? "blocked" : action.payload.status === "in_progress" && workItem.status === "queued" ? "started" : "progress";
      const event: AgentWorkEvent = { id: randomUUID(), projectId: workItem.projectId, workItemId: workItem.id, agentId: workItem.agentId, eventType, progress, message: action.payload.eventMessage || action.payload.blockedReason || action.payload.result || "工作项状态已更新。", createdAt: "刚刚" };
      return {
        ...current,
        agentWorkItems: current.agentWorkItems.map((item) => item.id === workItem.id ? { ...item, status: action.payload.status, progress, blockedReason: action.payload.blockedReason ?? item.blockedReason, result: action.payload.result ?? item.result, changedFiles: action.payload.changedFiles ?? item.changedFiles, testResult: action.payload.testResult ?? item.testResult, artifactUrl: action.payload.artifactUrl || item.artifactUrl, lastHeartbeatAt: "刚刚", startedAt: action.payload.status === "in_progress" ? item.startedAt || "刚刚" : item.startedAt, completedAt: action.payload.status === "completed" ? "刚刚" : item.completedAt, updatedAt: "刚刚" } : item),
        agentWorkEvents: [event, ...current.agentWorkEvents],
        activities: [logActivity("更新 Agent 工作项", workItem.title), ...current.activities]
      };
    }
    case "addAgentReport": {
      requireItem(current.projects.find((project) => project.id === action.payload.projectId), "项目");
      if (action.payload.workItemId) requireItem(current.agentWorkItems.find((item) => item.id === action.payload.workItemId), "Agent 工作项");
      const report: AgentReport = { id: randomUUID(), ...action.payload, workItemId: action.payload.workItemId || undefined, createdAt: "刚刚" };
      const workItem = action.payload.workItemId ? requireItem(current.agentWorkItems.find((item) => item.id === action.payload.workItemId), "Agent 工作项") : undefined;
      const event: AgentWorkEvent | undefined = workItem ? { id: randomUUID(), projectId: workItem.projectId, workItemId: workItem.id, agentId: report.agentId, eventType: "report", progress: report.progress, message: report.summary, createdAt: "刚刚" } : undefined;
      return {
        ...current,
        agentReports: [report, ...current.agentReports],
        agentWorkItems: action.payload.workItemId
          ? current.agentWorkItems.map((item) => item.id === action.payload.workItemId ? { ...item, status: action.payload.status || (action.payload.progress >= 100 ? "completed" : item.status === "queued" ? "in_progress" : item.status), progress: action.payload.progress, blockedReason: action.payload.blockedReason ?? item.blockedReason, changedFiles: action.payload.changedFiles ?? item.changedFiles, testResult: action.payload.testResult ?? item.testResult, artifactUrl: action.payload.artifactUrl || item.artifactUrl, lastHeartbeatAt: "刚刚", updatedAt: "刚刚" } : item)
          : current.agentWorkItems,
        agentWorkEvents: event ? [event, ...current.agentWorkEvents] : current.agentWorkEvents,
        activities: [logActivity("提交 Agent 汇报", action.payload.agentId), ...current.activities]
      };
    }
    case "upsertAgentExecution": {
      requireItem(current.projects.find((project) => project.id === action.payload.projectId), "项目");
      const existing = current.agentExecutions.find((item) => item.id === action.payload.id);
      const execution = {
        id: action.payload.id,
        workItemId: action.payload.workItemId,
        projectId: action.payload.projectId,
        projectName: action.payload.projectName,
        agentId: action.payload.agentId,
        title: action.payload.title,
        instructions: action.payload.instructions,
        workingDirectory: action.payload.workingDirectory,
        permissionProfile: action.payload.permissionProfile,
        status: action.payload.status,
        phase: action.payload.phase,
        createdAt: existing?.createdAt || "刚刚",
        updatedAt: "刚刚",
        error: action.payload.error,
        latestAction: action.payload.latestAction,
        retryCount: action.payload.retryCount ?? existing?.retryCount ?? 0,
        maxRetries: existing?.maxRetries ?? 2,
        verification: existing?.verification ?? [],
        diff: {
          filesChanged: action.payload.filesChanged ?? existing?.diff?.filesChanged ?? 0,
          additions: action.payload.additions ?? existing?.diff?.additions ?? 0,
          deletions: action.payload.deletions ?? existing?.diff?.deletions ?? 0,
          files: existing?.diff?.files ?? [],
          highRisk: existing?.diff?.highRisk ?? []
        },
        accepted: action.payload.accepted ?? existing?.accepted ?? null,
        snapshot: existing?.snapshot,
        report: existing?.report,
        approval: existing?.approval
      };
      const eventType = action.payload.status === "waiting_for_approval" ? "approval" : action.payload.status === "failed" ? "failed" : action.payload.status === "completed" ? "completed" : "progress";
      const event: AgentWorkEvent = {
        id: randomUUID(),
        projectId: action.payload.projectId,
        workItemId: action.payload.workItemId,
        agentId: action.payload.agentId,
        eventType,
        progress: action.payload.status === "completed" ? 100 : existing ? 40 : 10,
        message: action.payload.latestAction || action.payload.error || `执行状态：${action.payload.status}`,
        createdAt: "刚刚"
      };
      return {
        ...current,
        agentExecutions: existing
          ? current.agentExecutions.map((item) => item.id === existing.id ? { ...item, ...execution } : item)
          : [execution, ...current.agentExecutions],
        agentWorkEvents: [event, ...current.agentWorkEvents],
        activities: [logActivity("Agent 执行", `${action.payload.title} / ${action.payload.status}`), ...current.activities]
      };
    }
    case "toggleTask": {
      const task = requireItem(current.tasks.find((item) => item.id === action.payload.id), "任务");

      // 完成带重复规则的任务时，自动生成下一轮（Todoist 式循环任务）。
      // 已完成的这一条保留为历史记录，下一轮是全新任务，不再带 done 状态。
      if (!task.done && task.recurrenceRule) {
        const nextDate = nextOccurrenceDate(task.recurrenceRule, task.plannedDate || todayDateKey());
        if (nextDate) {
          const nextTask: Task = {
            ...task,
            id: randomUUID(),
            plannedDate: nextDate,
            status: "planned",
            todayFocus: false,
            done: false
          };
          return {
            ...current,
            tasks: [
              nextTask,
              ...current.tasks.map((item): Task =>
                item.id === task.id
                  ? { ...item, done: true, status: "completed", recurrenceRule: undefined }
                  : item
              )
            ],
            activities: [logActivity("完成重复任务", `${task.title}，下一轮 ${nextDate}`), ...current.activities]
          };
        }
      }

      return {
        ...current,
        tasks: current.tasks.map((item) =>
          item.id === task.id
            ? {
                ...item,
                done: !item.done,
                status: item.done ? "planned" : "completed"
              }
            : item
        )
      };
    }
    case "addTask": {
      const todayFocusCount = current.tasks.filter((task) => task.todayFocus && !task.done).length;
      const task: Task = {
        id: randomUUID(),
        title: action.payload.title,
        project: action.payload.project,
        goalId: action.payload.goalId,
        priority: action.payload.priority,
        due: action.payload.due || "今天",
        plannedDate: action.payload.plannedDate || todayKey(),
        status: "planned",
        todayFocus: Boolean(action.payload.todayFocus && todayFocusCount < 3),
        recurrenceRule: action.payload.recurrenceRule,
        reminderTime: action.payload.reminderTime,
        done: false
      };
      return {
        ...current,
        tasks: [task, ...current.tasks],
        activities: [logActivity("创建任务", task.title), ...current.activities]
      };
    }
    case "updateTask": {
      requireItem(current.tasks.find((task) => task.id === action.payload.id), "任务");
      return {
        ...current,
        tasks: current.tasks.map((task) =>
          task.id === action.payload.id
            ? {
                ...task,
                title: action.payload.title,
                project: action.payload.project,
                goalId: action.payload.goalId,
                priority: action.payload.priority,
                due: action.payload.due || "今天",
                plannedDate: action.payload.plannedDate,
                todayFocus: Boolean(action.payload.todayFocus),
                status: action.payload.status || task.status || "planned",
                recurrenceRule: action.payload.recurrenceRule === undefined ? task.recurrenceRule : action.payload.recurrenceRule,
                reminderTime: action.payload.reminderTime === undefined ? task.reminderTime : action.payload.reminderTime,
                done: (action.payload.status || task.status) === "completed"
              }
            : task
        ),
        activities: [logActivity("更新任务", action.payload.title), ...current.activities]
      };
    }
    case "deleteTask": {
      const task = requireItem(current.tasks.find((item) => item.id === action.payload.id), "任务");
      return {
        ...current,
        tasks: current.tasks.filter((item) => item.id !== action.payload.id),
        activities: [logActivity("删除任务", task.title), ...current.activities]
      };
    }
    case "addInbox": {
      const item: InboxItem = {
        id: randomUUID(),
        title: action.payload.title,
        type: action.payload.type,
        category: action.payload.category,
        status: "pending",
        createdAt: "刚刚"
      };
      return { ...current, inbox: [item, ...current.inbox] };
    }
    case "updateInbox":
      requireItem(current.inbox.find((item) => item.id === action.payload.id), "收件箱记录");
      return {
        ...current,
        inbox: current.inbox.map((item) =>
          item.id === action.payload.id
            ? { ...item, title: action.payload.title, type: action.payload.type, category: action.payload.category, status: action.payload.status }
            : item
        ),
        activities: [logActivity("更新收件箱", action.payload.title), ...current.activities]
      };
    case "deleteInbox": {
      const item = requireItem(current.inbox.find((entry) => entry.id === action.payload.id), "收件箱记录");
      return {
        ...current,
        inbox: current.inbox.filter((entry) => entry.id !== action.payload.id),
        activities: [logActivity("删除收件箱", item.title), ...current.activities]
      };
    }
    case "addPrompt": {
      const prompt: Prompt = {
        id: randomUUID(),
        title: action.payload.title,
        category: action.payload.category,
        content: action.payload.content,
        model: "gpt-5",
        favorite: false,
        useCount: 0,
        updatedAt: "刚刚"
      };
      return { ...current, prompts: [prompt, ...current.prompts] };
    }
    case "updatePrompt":
      requireItem(current.prompts.find((prompt) => prompt.id === action.payload.id), "提示词");
      return {
        ...current,
        prompts: current.prompts.map((prompt) =>
          prompt.id === action.payload.id
            ? { ...prompt, title: action.payload.title, category: action.payload.category, content: action.payload.content, favorite: action.payload.favorite, updatedAt: "刚刚" }
            : prompt
        ),
        activities: [logActivity("更新提示词", action.payload.title), ...current.activities]
      };
    case "deletePrompt": {
      const prompt = requireItem(current.prompts.find((item) => item.id === action.payload.id), "提示词");
      return {
        ...current,
        prompts: current.prompts.filter((item) => item.id !== action.payload.id),
        activities: [logActivity("删除提示词", prompt.title), ...current.activities]
      };
    }
    case "addNote": {
      const note: Note = {
        id: randomUUID(),
        title: action.payload.title,
        type: action.payload.type,
        summary: action.payload.summary,
        favorite: false,
        updatedAt: "刚刚"
      };
      return { ...current, notes: [note, ...current.notes] };
    }
    case "updateNote":
      requireItem(current.notes.find((note) => note.id === action.payload.id), "知识笔记");
      return {
        ...current,
        notes: current.notes.map((note) =>
          note.id === action.payload.id
            ? { ...note, title: action.payload.title, type: action.payload.type, summary: action.payload.summary, favorite: action.payload.favorite, updatedAt: "刚刚" }
            : note
        ),
        activities: [logActivity("更新知识", action.payload.title), ...current.activities]
      };
    case "deleteNote": {
      const note = requireItem(current.notes.find((item) => item.id === action.payload.id), "知识笔记");
      return {
        ...current,
        notes: current.notes.filter((item) => item.id !== action.payload.id),
        activities: [logActivity("删除知识", note.title), ...current.activities]
      };
    }
    case "addFileRecord": {
      const file = {
        id: randomUUID(),
        name: action.payload.name,
        kind: action.payload.kind,
        project: action.payload.project || "未关联",
        size: action.payload.size || "未知",
        mimeType: action.payload.mimeType,
        sourceUrl: action.payload.sourceUrl,
        storagePath: action.payload.storagePath,
        updatedAt: "刚刚"
      };
      return {
        ...current,
        files: [file, ...current.files],
        activities: [logActivity("登记文件", file.name), ...current.activities]
      };
    }
    case "deleteFile": {
      const file = requireItem(current.files.find((item) => item.id === action.payload.id), "文件");
      return {
        ...current,
        files: current.files.filter((item) => item.id !== action.payload.id),
        activities: [logActivity("删除文件", file.name), ...current.activities]
      };
    }
    case "addLifeArea": {
      const area: LifeArea = {
        id: randomUUID(),
        name: action.payload.name,
        description: action.payload.description,
        icon: action.payload.icon,
        displayOrder: current.lifeAreas.length + 1,
        status: "active",
        privacyLevel: action.payload.privacyLevel,
        updatedAt: "刚刚"
      };
      return {
        ...current,
        lifeAreas: [...current.lifeAreas, area],
        activities: [logActivity("创建人生领域", area.name), ...current.activities]
      };
    }
    case "updateLifeAreaStatus":
      requireItem(current.lifeAreas.find((area) => area.id === action.payload.id), "人生领域");
      return {
        ...current,
        lifeAreas: current.lifeAreas.map((area) =>
          area.id === action.payload.id ? { ...area, status: action.payload.status, updatedAt: "刚刚" } : area
        )
      };
    case "addGoal": {
      const goal: Goal = {
        id: randomUUID(),
        lifeAreaId: action.payload.lifeAreaId,
        title: action.payload.title,
        description: action.payload.description,
        motivation: action.payload.motivation,
        successCriteria: action.payload.successCriteria,
        status: "active",
        priority: action.payload.priority,
        startDate: todayDateKey(),
        targetDate: action.payload.targetDate,
        manualProgress: 0,
        progressMode: action.payload.progressMode,
        nextAction: action.payload.nextAction,
        privacyLevel: action.payload.privacyLevel,
        updatedAt: "刚刚"
      };
      return {
        ...current,
        goals: [goal, ...current.goals],
        activities: [logActivity("创建目标", goal.title), ...current.activities]
      };
    }
    case "updateGoalProgress":
      requireItem(current.goals.find((goal) => goal.id === action.payload.id), "目标");
      return {
        ...current,
        goals: current.goals.map((goal) =>
          goal.id === action.payload.id
            ? {
                ...goal,
                manualProgress: action.payload.manualProgress,
                progressMode: action.payload.progressMode,
                updatedAt: "刚刚"
              }
            : goal
        )
      };
    case "addHabit": {
      const habit: Habit = {
        id: randomUUID(),
        ...action.payload,
        status: "active",
        updatedAt: "刚刚"
      };
      return {
        ...current,
        habits: [habit, ...current.habits],
        activities: [logActivity("创建习惯", habit.name), ...current.activities]
      };
    }
    case "logHabit": {
      const habit = requireItem(current.habits.find((item) => item.id === action.payload.habitId), "习惯");
      const log: HabitLog = {
        id: randomUUID(),
        habitId: action.payload.habitId,
        logDate: todayKey(),
        status: action.payload.status,
        value: action.payload.value,
        note: action.payload.note,
        completedAt: action.payload.status === "completed" ? new Date().toISOString() : undefined
      };
      return {
        ...current,
        habitLogs: [log, ...current.habitLogs],
        activities: [logActivity("记录习惯", habit.name), ...current.activities]
      };
    }
    case "logRoutine": {
      const routine = requireItem(current.routines.find((item) => item.id === action.payload.routineId), "例程");
      const log: RoutineLog = {
        id: randomUUID(),
        routineId: action.payload.routineId,
        logDate: todayKey(),
        status: action.payload.status,
        completedStepIds: action.payload.completedStepIds
      };
      return {
        ...current,
        routineLogs: [log, ...current.routineLogs],
        activities: [logActivity("记录例程", routine.name), ...current.activities]
      };
    }
    case "saveDailyCheckin": {
      const next: DailyCheckin = {
        id: randomUUID(),
        ...action.payload,
        privacyLevel: "sensitive",
        updatedAt: "刚刚"
      };
      return {
        ...current,
        dailyCheckins: [next, ...current.dailyCheckins.filter((item) => item.date !== action.payload.date)],
        activities: [logActivity("保存每日记录", action.payload.date), ...current.activities]
      };
    }
    case "saveDailyReview": {
      const next: DailyReview = {
        id: randomUUID(),
        ...action.payload,
        privacyLevel: "sensitive",
        updatedAt: "刚刚"
      };
      return {
        ...current,
        dailyReviews: [next, ...current.dailyReviews.filter((item) => item.date !== action.payload.date)],
        activities: [logActivity("保存每日复盘", action.payload.date), ...current.activities]
      };
    }
    case "saveWeeklyReview": {
      const next: WeeklyReview = {
        id: randomUUID(),
        ...action.payload,
        privacyLevel: "sensitive",
        updatedAt: "刚刚"
      };
      return {
        ...current,
        weeklyReviews: [next, ...current.weeklyReviews.filter((item) => item.weekStart !== action.payload.weekStart)],
        activities: [logActivity("保存每周复盘", action.payload.weekStart), ...current.activities]
      };
    }
    case "resetData":
      return seedData;
  }
}
