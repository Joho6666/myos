import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { seedData } from "@/lib/data/seed";
import type { Activity, AgentAssignment, AgentReport, AgentWorkItem, AutomationRun, DailyCheckin, DailyReview, FileRecord, Goal, Habit, HabitLog, InboxItem, LifeArea, MyOSData, Note, PrivacyLevel, Project, Prompt, Routine, RoutineLog, RoutineStep, Task, WeeklyReview } from "@/lib/data/models";
import { dateOnly, todayAlias } from "./date-utils";
import type { MyOSSession } from "@/lib/auth/session";
import type { MyOSAction } from "./schemas";
import type { AgentWorkEvent, ProjectMilestone, ProjectRisk } from "@/lib/data/models";

type Row = Record<string, unknown>;

export class SupabaseStoreError extends Error {
  constructor(message: string, public readonly status = 500) {
    super(message);
  }
}

export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new SupabaseStoreError("Supabase 后端未配置。请设置 NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY。", 503);
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown) {
  return typeof value === "number" ? value : undefined;
}

function bool(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function privacy(value: unknown, fallback: PrivacyLevel = "normal"): PrivacyLevel {
  return value === "sensitive" || value === "vault" || value === "normal" ? value : fallback;
}

function dateLabel(value: unknown) {
  const raw = text(value);
  if (!raw) {
    return "刚刚";
  }
  return raw.slice(0, 10);
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";
}

export async function resolveOwnerUserId(client: SupabaseClient, session: MyOSSession) {
  const explicit = process.env.SUPABASE_OWNER_USER_ID?.trim();
  if (explicit) {
    return explicit;
  }

  let page = 1;
  while (page < 20) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 100 });
    if (error) {
      throw new SupabaseStoreError(`无法读取 Supabase 用户：${error.message}`, 500);
    }

    const user = data.users.find((item) => item.email?.toLowerCase() === session.email.toLowerCase());
    if (user) {
      return user.id;
    }

    if (data.users.length < 100) {
      break;
    }
    page += 1;
  }

  throw new SupabaseStoreError("Supabase 中没有找到 owner 邮箱对应的用户。请先在 Supabase Auth 创建该用户，或设置 SUPABASE_OWNER_USER_ID。", 503);
}

async function requireOk<T>(promise: PromiseLike<{ data: T; error: { message: string; code?: string } | null }>, context: string) {
  const { data, error } = await promise;
  if (error) {
    const missingSingleRow = error.code === "PGRST116" || error.message.includes("Cannot coerce the result to a single JSON object");
    throw new SupabaseStoreError(`${context}失败：${missingSingleRow ? "记录不存在或已被删除。" : error.message}`, missingSingleRow ? 404 : 500);
  }
  return data;
}

async function ensureProfile(client: SupabaseClient, userId: string, email: string) {
  await requireOk(
    client.from("profiles").upsert({ id: userId, email, updated_at: new Date().toISOString() }, { onConflict: "id" }),
    "保存 owner profile"
  );
}

function mapProject(row: Row): Project {
  return {
    id: text(row.id),
    goalId: text(row.goal_id) || undefined,
    name: text(row.name),
    category: text(row.category, "其他"),
    status: text(row.status, "planned") as Project["status"],
    path: text(row.local_path, "~/dev/project"),
    nextAction: text(row.next_action),
    updatedAt: dateLabel(row.updated_at),
    favorite: bool(row.favorite),
    summary: text(row.agent_summary) || undefined,
    techStack: Array.isArray(row.tech_stack) ? row.tech_stack.map(String) : [],
    progressMode: text(row.agent_progress_mode, "agent_work") as Project["progressMode"],
    manualProgress: Number(row.agent_manual_progress ?? 0)
  };
}

function mapProjectMilestone(row: Row): ProjectMilestone {
  return {
    id: text(row.id), projectId: text(row.project_id), title: text(row.title), description: text(row.description),
    status: text(row.status, "planned") as ProjectMilestone["status"], targetDate: text(row.target_date) || undefined,
    progress: Number(row.progress ?? 0), updatedAt: dateLabel(row.updated_at)
  };
}

function mapProjectRisk(row: Row): ProjectRisk {
  return {
    id: text(row.id), projectId: text(row.project_id), title: text(row.title),
    severity: text(row.severity, "medium") as ProjectRisk["severity"], status: text(row.status, "open") as ProjectRisk["status"],
    mitigation: text(row.mitigation), updatedAt: dateLabel(row.updated_at)
  };
}

function mapAgentAssignment(row: Row): AgentAssignment {
  return { id: text(row.id), projectId: text(row.project_id), agentId: text(row.agent_id), role: text(row.role), createdAt: dateLabel(row.created_at) };
}

function mapAgentWorkItem(row: Row): AgentWorkItem {
  return {
    id: text(row.id), projectId: text(row.project_id), agentId: text(row.agent_id), title: text(row.title), instructions: text(row.instructions),
    status: text(row.status, "queued") as AgentWorkItem["status"], progress: Number(row.progress ?? 0), updatedAt: dateLabel(row.updated_at),
    lastHeartbeatAt: text(row.last_heartbeat_at) || undefined, startedAt: text(row.started_at) || undefined, completedAt: text(row.completed_at) || undefined,
    blockedReason: text(row.blocked_reason) || undefined, result: text(row.result) || undefined,
    changedFiles: Array.isArray(row.changed_files) ? row.changed_files.map(String) : [], testResult: text(row.test_result) || undefined,
    artifactUrl: text(row.artifact_url) || undefined, failureCount: Number(row.failure_count ?? 0)
  };
}

function mapAgentReport(row: Row): AgentReport {
  return { id: text(row.id), projectId: text(row.project_id), workItemId: text(row.work_item_id) || undefined, agentId: text(row.agent_id), summary: text(row.summary), progress: Number(row.progress ?? 0), createdAt: dateLabel(row.created_at), blockedReason: text(row.blocked_reason) || undefined, changedFiles: Array.isArray(row.changed_files) ? row.changed_files.map(String) : [], testResult: text(row.test_result) || undefined, artifactUrl: text(row.artifact_url) || undefined };
}

function mapAgentWorkEvent(row: Row): AgentWorkEvent {
  return {
    id: text(row.id), projectId: text(row.project_id), workItemId: text(row.work_item_id), agentId: text(row.agent_id),
    eventType: text(row.event_type, "progress") as AgentWorkEvent["eventType"], progress: Number(row.progress ?? 0), message: text(row.message), createdAt: dateLabel(row.created_at)
  };
}

function mapTask(row: Row): Task {
  return {
    id: text(row.id),
    goalId: text(row.goal_id) || undefined,
    title: text(row.title),
    project: text(row.project_name) || undefined,
    priority: text(row.priority, "medium") as Task["priority"],
    due: text(row.due_text, "今天"),
    plannedDate: todayAlias(row.planned_date) || undefined,
    dueDate: text(row.due_date) || undefined,
    estimatedMinutes: numberValue(row.estimated_minutes),
    actualMinutes: numberValue(row.actual_minutes),
    status: text(row.status, "planned") as Task["status"],
    todayFocus: bool(row.today_focus),
    recurrenceRule: text(row.recurrence_rule) || undefined,
    done: text(row.status) === "completed"
  };
}

function mapInbox(row: Row): InboxItem {
  return {
    id: text(row.id),
    title: text(row.title),
    type: text(row.item_type, "text") as InboxItem["type"],
    category: text(row.category, "未分类"),
    status: text(row.status, "pending") as InboxItem["status"],
    createdAt: dateLabel(row.created_at)
  };
}

function mapPrompt(row: Row): Prompt {
  return {
    id: text(row.id),
    title: text(row.title),
    category: text(row.category, "其他"),
    model: text(row.recommended_model, "gpt-5"),
    content: text(row.content),
    favorite: bool(row.favorite),
    useCount: Number(row.use_count ?? 0),
    updatedAt: dateLabel(row.updated_at)
  };
}

function mapNote(row: Row): Note {
  return {
    id: text(row.id),
    title: text(row.title),
    type: text(row.note_type, "note"),
    summary: text(row.summary),
    updatedAt: dateLabel(row.updated_at),
    favorite: bool(row.favorite)
  };
}

function mapFile(row: Row): FileRecord {
  const storagePath = text(row.storage_path);
  const downloadable = Boolean(storagePath && !storagePath.startsWith("placeholder/") && !storagePath.startsWith("manual/"));
  return {
    id: text(row.id),
    name: text(row.original_filename) || text(row.filename),
    kind: text(row.file_type, "file"),
    project: text(row.category, "未关联"),
    size: text(row.display_size) || `${Number(row.size_bytes ?? 0)} B`,
    mimeType: text(row.mime_type),
    sourceUrl: text(row.source_url) || (downloadable ? `/api/files/download/${text(row.id)}` : undefined),
    storagePath,
    updatedAt: dateLabel(row.updated_at)
  };
}

function mapActivity(row: Row): Activity {
  return {
    id: text(row.id),
    action: text(row.action),
    detail: text(row.description),
    time: dateLabel(row.created_at),
    result: text(row.result, "success") as Activity["result"]
  };
}

function mapAutomation(row: Row): AutomationRun {
  return {
    id: text(row.id),
    name: text(row.name),
    status: text(row.status, "not_configured") as AutomationRun["status"],
    lastRun: text(row.last_run_label, "尚未运行"),
    nextRun: text(row.next_run_label, "配置后可用")
  };
}

function mapLifeArea(row: Row): LifeArea {
  return {
    id: text(row.id),
    name: text(row.name),
    description: text(row.description),
    icon: text(row.icon, "circle"),
    displayOrder: Number(row.display_order ?? 0),
    status: text(row.status, "active") as LifeArea["status"],
    privacyLevel: privacy(row.privacy_level),
    updatedAt: dateLabel(row.updated_at)
  };
}

function mapGoal(row: Row): Goal {
  return {
    id: text(row.id),
    lifeAreaId: text(row.life_area_id),
    title: text(row.title),
    description: text(row.description),
    motivation: text(row.motivation),
    successCriteria: text(row.success_criteria),
    status: text(row.status, "active") as Goal["status"],
    priority: text(row.priority, "medium") as Goal["priority"],
    startDate: text(row.start_date) || undefined,
    targetDate: text(row.target_date) || undefined,
    manualProgress: Number(row.manual_progress ?? 0),
    progressMode: text(row.progress_mode, "manual") as Goal["progressMode"],
    nextAction: text(row.next_action),
    abandonConditions: text(row.abandon_conditions) || undefined,
    privacyLevel: privacy(row.privacy_level),
    updatedAt: dateLabel(row.updated_at),
    archivedAt: text(row.archived_at) || undefined
  };
}

function mapHabit(row: Row): Habit {
  return {
    id: text(row.id),
    lifeAreaId: text(row.life_area_id) || undefined,
    goalId: text(row.goal_id) || undefined,
    name: text(row.name),
    description: text(row.description),
    frequencyType: text(row.frequency_type, "daily") as Habit["frequencyType"],
    recurrenceRule: text(row.recurrence_rule) || undefined,
    targetValue: numberValue(row.target_value),
    unit: text(row.unit) || undefined,
    reminderTime: text(row.reminder_time) || undefined,
    status: text(row.status, "active") as Habit["status"],
    privacyLevel: privacy(row.privacy_level),
    updatedAt: dateLabel(row.updated_at)
  };
}

function mapHabitLog(row: Row): HabitLog {
  return {
    id: text(row.id),
    habitId: text(row.habit_id),
    logDate: todayAlias(row.log_date),
    status: text(row.status, "completed") as HabitLog["status"],
    value: numberValue(row.value),
    note: text(row.note) || undefined,
    completedAt: text(row.completed_at) || undefined
  };
}

function mapRoutine(row: Row): Routine {
  return {
    id: text(row.id),
    lifeAreaId: text(row.life_area_id) || undefined,
    name: text(row.name),
    description: text(row.description),
    scheduleType: text(row.schedule_type, "daily") as Routine["scheduleType"],
    recurrenceRule: text(row.recurrence_rule) || undefined,
    status: text(row.status, "active") as Routine["status"],
    privacyLevel: privacy(row.privacy_level),
    updatedAt: dateLabel(row.updated_at)
  };
}

function mapRoutineStep(row: Row): RoutineStep {
  return {
    id: text(row.id),
    routineId: text(row.routine_id),
    title: text(row.title),
    displayOrder: Number(row.display_order ?? 0),
    estimatedMinutes: numberValue(row.estimated_minutes)
  };
}

function mapRoutineLog(row: Row): RoutineLog {
  return {
    id: text(row.id),
    routineId: text(row.routine_id),
    logDate: todayAlias(row.log_date),
    status: text(row.status, "completed") as RoutineLog["status"],
    completedStepIds: Array.isArray(row.completed_step_ids) ? row.completed_step_ids.map(String) : [],
    note: text(row.note) || undefined
  };
}

function mapDailyCheckin(row: Row): DailyCheckin {
  return {
    id: text(row.id),
    date: todayAlias(row.checkin_date),
    sleepAt: text(row.sleep_at) || undefined,
    wakeAt: text(row.wake_at) || undefined,
    sleepHours: numberValue(row.sleep_hours),
    sleepQuality: numberValue(row.sleep_quality),
    energy: numberValue(row.energy),
    mood: numberValue(row.mood),
    stress: numberValue(row.stress),
    exercise: text(row.exercise) || undefined,
    studyMinutes: numberValue(row.study_minutes),
    workMinutes: numberValue(row.work_minutes),
    note: text(row.note) || undefined,
    privacyLevel: privacy(row.privacy_level, "sensitive"),
    updatedAt: dateLabel(row.updated_at)
  };
}

function mapDailyReview(row: Row): DailyReview {
  return {
    id: text(row.id),
    date: todayAlias(row.review_date),
    completed: text(row.completed),
    problems: text(row.problems),
    state: text(row.state),
    tomorrowFocus: text(row.tomorrow_focus),
    privacyLevel: privacy(row.privacy_level, "sensitive"),
    updatedAt: dateLabel(row.updated_at)
  };
}

function mapWeeklyReview(row: Row): WeeklyReview {
  return {
    id: text(row.id),
    weekStart: text(row.week_start),
    completedTaskIds: Array.isArray(row.completed_task_ids) ? row.completed_task_ids.map(String) : [],
    unfinishedTaskIds: Array.isArray(row.unfinished_task_ids) ? row.unfinished_task_ids.map(String) : [],
    projectChanges: text(row.project_changes),
    goalProgress: text(row.goal_progress),
    habitCompletionRate: Number(row.habit_completion_rate ?? 0),
    studyMinutes: Number(row.study_minutes ?? 0),
    sleepTrend: text(row.sleep_trend),
    moodTrend: text(row.mood_trend),
    spendingSummaryPlaceholder: text(row.spending_summary_placeholder),
    nextWeekFocus: Array.isArray(row.next_week_focus) ? row.next_week_focus.map(String) : [],
    privacyLevel: privacy(row.privacy_level, "sensitive"),
    updatedAt: dateLabel(row.updated_at)
  };
}

function applyIdMap<T extends { id: string }>(items: T[], idMap: Map<string, string>) {
  return items.map((item) => ({ ...item, id: idMap.get(item.id) ?? item.id }));
}

function makeIdMap(items: Array<{ id: string }>) {
  return new Map(items.map((item) => [item.id, randomUUID()]));
}

async function seedIfEmpty(client: SupabaseClient, userId: string) {
  const profile = await requireOk(
    client.from("profiles").select("myos_seeded_at").eq("id", userId).single(),
    "读取 owner 初始化状态"
  );
  if (text((profile as Row).myos_seeded_at)) {
    return;
  }

  const { count, error } = await client.from("projects").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if (error) {
    throw new SupabaseStoreError(`检查 Supabase 初始数据失败：${error.message}`, 500);
  }
  if ((count ?? 0) > 0) {
    await requireOk(
      client.from("profiles").update({ myos_seeded_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", userId),
      "保存 owner 初始化状态"
    );
    return;
  }

  const lifeAreaIdMap = new Map<string, string>();
  for (const area of seedData.lifeAreas) {
    const inserted = await requireOk(
      client
        .from("life_areas")
        .insert({
          user_id: userId,
          name: area.name,
          description: area.description,
          icon: area.icon,
          display_order: area.displayOrder,
          status: area.status,
          privacy_level: area.privacyLevel
        })
        .select("id")
        .single(),
      "导入人生领域"
    );
    lifeAreaIdMap.set(area.id, text((inserted as Row).id));
  }

  const goalIdMap = new Map<string, string>();
  for (const goal of seedData.goals) {
    const inserted = await requireOk(
      client
        .from("goals")
        .insert({
          user_id: userId,
          life_area_id: lifeAreaIdMap.get(goal.lifeAreaId) ?? null,
          title: goal.title,
          description: goal.description,
          motivation: goal.motivation,
          success_criteria: goal.successCriteria,
          status: goal.status,
          priority: goal.priority,
          start_date: dateOnly(goal.startDate),
          target_date: dateOnly(goal.targetDate),
          manual_progress: goal.manualProgress,
          progress_mode: goal.progressMode,
          next_action: goal.nextAction,
          privacy_level: goal.privacyLevel
        })
        .select("id")
        .single(),
      "导入目标"
    );
    goalIdMap.set(goal.id, text((inserted as Row).id));
  }

  const projectIdMap = makeIdMap(seedData.projects);
  const projectMilestoneIdMap = makeIdMap(seedData.projectMilestones);
  const projectRiskIdMap = makeIdMap(seedData.projectRisks);
  const taskIdMap = makeIdMap(seedData.tasks);
  const inboxIdMap = makeIdMap(seedData.inbox);
  const promptIdMap = makeIdMap(seedData.prompts);
  const noteIdMap = makeIdMap(seedData.notes);
  const fileIdMap = makeIdMap(seedData.files);
  const activityIdMap = makeIdMap(seedData.activities);
  const automationIdMap = makeIdMap(seedData.automations);
  const habitIdMap = makeIdMap(seedData.habits);
  const habitLogIdMap = makeIdMap(seedData.habitLogs);
  const routineIdMap = makeIdMap(seedData.routines);
  const routineStepIdMap = makeIdMap(seedData.routineSteps);
  const routineLogIdMap = makeIdMap(seedData.routineLogs);
  const dailyCheckinIdMap = makeIdMap(seedData.dailyCheckins);
  const dailyReviewIdMap = makeIdMap(seedData.dailyReviews);
  const weeklyReviewIdMap = makeIdMap(seedData.weeklyReviews);
  const agentAssignmentIdMap = makeIdMap(seedData.agentAssignments);
  const agentWorkItemIdMap = makeIdMap(seedData.agentWorkItems);
  const agentReportIdMap = makeIdMap(seedData.agentReports);
  const agentWorkEventIdMap = makeIdMap(seedData.agentWorkEvents);

  await syncSupabaseData(client, userId, {
    ...seedData,
    lifeAreas: applyIdMap(seedData.lifeAreas, lifeAreaIdMap),
    goals: seedData.goals.map((goal) => ({
      ...goal,
      id: goalIdMap.get(goal.id) ?? goal.id,
      lifeAreaId: lifeAreaIdMap.get(goal.lifeAreaId) ?? goal.lifeAreaId
    })),
    projects: seedData.projects.map((project) => ({
      ...project,
      id: projectIdMap.get(project.id) ?? project.id,
      goalId: project.goalId ? goalIdMap.get(project.goalId) : undefined
    })),
    projectMilestones: seedData.projectMilestones.map((milestone) => ({
      ...milestone,
      id: projectMilestoneIdMap.get(milestone.id) ?? milestone.id,
      projectId: projectIdMap.get(milestone.projectId) ?? milestone.projectId
    })),
    projectRisks: seedData.projectRisks.map((risk) => ({
      ...risk,
      id: projectRiskIdMap.get(risk.id) ?? risk.id,
      projectId: projectIdMap.get(risk.projectId) ?? risk.projectId
    })),
    tasks: seedData.tasks.map((task) => ({
      ...task,
      id: taskIdMap.get(task.id) ?? task.id,
      goalId: task.goalId ? goalIdMap.get(task.goalId) : undefined
    })),
    inbox: applyIdMap(seedData.inbox, inboxIdMap),
    prompts: applyIdMap(seedData.prompts, promptIdMap),
    notes: applyIdMap(seedData.notes, noteIdMap),
    files: applyIdMap(seedData.files, fileIdMap),
    activities: applyIdMap(seedData.activities, activityIdMap),
    automations: applyIdMap(seedData.automations, automationIdMap),
    habits: seedData.habits.map((habit) => ({
      ...habit,
      id: habitIdMap.get(habit.id) ?? habit.id,
      lifeAreaId: habit.lifeAreaId ? lifeAreaIdMap.get(habit.lifeAreaId) : undefined,
      goalId: habit.goalId ? goalIdMap.get(habit.goalId) : undefined
    })),
    habitLogs: seedData.habitLogs.map((log) => ({
      ...log,
      id: habitLogIdMap.get(log.id) ?? log.id,
      habitId: habitIdMap.get(log.habitId) ?? log.habitId
    })),
    routines: seedData.routines.map((routine) => ({
      ...routine,
      id: routineIdMap.get(routine.id) ?? routine.id,
      lifeAreaId: routine.lifeAreaId ? lifeAreaIdMap.get(routine.lifeAreaId) : undefined
    })),
    routineSteps: seedData.routineSteps.map((step) => ({
      ...step,
      id: routineStepIdMap.get(step.id) ?? step.id,
      routineId: routineIdMap.get(step.routineId) ?? step.routineId
    })),
    routineLogs: seedData.routineLogs.map((log) => ({
      ...log,
      id: routineLogIdMap.get(log.id) ?? log.id,
      routineId: routineIdMap.get(log.routineId) ?? log.routineId,
      completedStepIds: log.completedStepIds.map((id) => routineStepIdMap.get(id) ?? id)
    })),
    dailyCheckins: applyIdMap(seedData.dailyCheckins, dailyCheckinIdMap),
    dailyReviews: applyIdMap(seedData.dailyReviews, dailyReviewIdMap),
    weeklyReviews: seedData.weeklyReviews.map((review) => ({
      ...review,
      id: weeklyReviewIdMap.get(review.id) ?? review.id,
      completedTaskIds: review.completedTaskIds.map((id) => taskIdMap.get(id) ?? id),
      unfinishedTaskIds: review.unfinishedTaskIds.map((id) => taskIdMap.get(id) ?? id)
    })),
    agentAssignments: seedData.agentAssignments.map((assignment) => ({
      ...assignment,
      id: agentAssignmentIdMap.get(assignment.id) ?? assignment.id,
      projectId: projectIdMap.get(assignment.projectId) ?? assignment.projectId
    })),
    agentWorkItems: seedData.agentWorkItems.map((item) => ({
      ...item,
      id: agentWorkItemIdMap.get(item.id) ?? item.id,
      projectId: projectIdMap.get(item.projectId) ?? item.projectId
    })),
    agentReports: seedData.agentReports.map((report) => ({
      ...report,
      id: agentReportIdMap.get(report.id) ?? report.id,
      projectId: projectIdMap.get(report.projectId) ?? report.projectId,
      workItemId: report.workItemId ? agentWorkItemIdMap.get(report.workItemId) ?? report.workItemId : undefined
    })),
    agentWorkEvents: seedData.agentWorkEvents.map((event) => ({
      ...event,
      id: agentWorkEventIdMap.get(event.id) ?? event.id,
      projectId: projectIdMap.get(event.projectId) ?? event.projectId,
      workItemId: agentWorkItemIdMap.get(event.workItemId) ?? event.workItemId
    }))
  });

  await requireOk(
    client.from("profiles").update({ myos_seeded_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", userId),
    "保存 owner 初始化状态"
  );
}

async function readRows(client: SupabaseClient, userId: string, table: string, orderColumn = "updated_at", ascending = false) {
  return await requireOk(client.from(table).select("*").eq("user_id", userId).order(orderColumn, { ascending }), `读取 ${table}`);
}

async function readSupabaseData(client: SupabaseClient, userId: string): Promise<MyOSData> {
  const [
    projects,
    projectMilestones,
    projectRisks,
    tasks,
    inbox,
    prompts,
    notes,
    files,
    activities,
    automations,
    lifeAreas,
    goals,
    habits,
    habitLogs,
    routines,
    routineSteps,
    routineLogs,
    dailyCheckins,
    dailyReviews,
    weeklyReviews,
    agentAssignments,
    agentWorkItems,
    agentReports,
    agentWorkEvents
  ] = await Promise.all([
    readRows(client, userId, "projects"),
    readRows(client, userId, "project_milestones"),
    readRows(client, userId, "project_risks"),
    readRows(client, userId, "project_tasks"),
    readRows(client, userId, "inbox_items", "created_at"),
    readRows(client, userId, "prompts"),
    readRows(client, userId, "notes"),
    readRows(client, userId, "files"),
    readRows(client, userId, "activity_logs", "created_at"),
    readRows(client, userId, "automation_workflows"),
    readRows(client, userId, "life_areas", "display_order", true),
    readRows(client, userId, "goals"),
    readRows(client, userId, "habits"),
    readRows(client, userId, "habit_logs", "log_date"),
    readRows(client, userId, "routines"),
    readRows(client, userId, "routine_steps", "display_order", true),
    readRows(client, userId, "routine_logs", "log_date"),
    readRows(client, userId, "daily_checkins", "checkin_date"),
    readRows(client, userId, "daily_reviews", "review_date"),
    readRows(client, userId, "weekly_reviews", "week_start"),
    readRows(client, userId, "project_agent_assignments", "created_at"),
    readRows(client, userId, "agent_work_items"),
    readRows(client, userId, "agent_reports", "created_at"),
    readRows(client, userId, "agent_work_events", "created_at")
  ]);

  return {
    projects: (projects as Row[]).map(mapProject),
    projectMilestones: (projectMilestones as Row[]).map(mapProjectMilestone),
    projectRisks: (projectRisks as Row[]).map(mapProjectRisk),
    tasks: (tasks as Row[]).map(mapTask),
    inbox: (inbox as Row[]).map(mapInbox),
    prompts: (prompts as Row[]).map(mapPrompt),
    notes: (notes as Row[]).map(mapNote),
    files: (files as Row[]).map(mapFile),
    activities: (activities as Row[]).map(mapActivity),
    automations: (automations as Row[]).map(mapAutomation),
    lifeAreas: (lifeAreas as Row[]).map(mapLifeArea),
    goals: (goals as Row[]).map(mapGoal),
    habits: (habits as Row[]).map(mapHabit),
    habitLogs: (habitLogs as Row[]).map(mapHabitLog),
    routines: (routines as Row[]).map(mapRoutine),
    routineSteps: (routineSteps as Row[]).map(mapRoutineStep),
    routineLogs: (routineLogs as Row[]).map(mapRoutineLog),
    dailyCheckins: (dailyCheckins as Row[]).map(mapDailyCheckin),
    dailyReviews: (dailyReviews as Row[]).map(mapDailyReview),
    weeklyReviews: (weeklyReviews as Row[]).map(mapWeeklyReview),
    agentAssignments: (agentAssignments as Row[]).map(mapAgentAssignment),
    agentWorkItems: (agentWorkItems as Row[]).map(mapAgentWorkItem),
    agentReports: (agentReports as Row[]).map(mapAgentReport),
    agentWorkEvents: (agentWorkEvents as Row[]).map(mapAgentWorkEvent)
  };
}

async function deleteUserRows(client: SupabaseClient, userId: string) {
  const tables = [
    "agent_work_events",
    "agent_reports",
    "agent_work_items",
    "project_risks",
    "project_milestones",
    "project_agent_assignments",
    "weekly_reviews",
    "daily_reviews",
    "daily_checkins",
    "routine_logs",
    "routine_steps",
    "routines",
    "habit_logs",
    "habits",
    "project_tasks",
    "projects",
    "goals",
    "life_areas",
    "inbox_items",
    "files",
    "notes",
    "prompts",
    "automation_workflows",
    "sync_logs",
    "external_resource_links",
    "external_integrations",
    "entity_tags",
    "tags",
    "activity_logs"
  ];

  for (const table of tables) {
    await requireOk(client.from(table).delete().eq("user_id", userId), `清理 ${table}`);
  }
}

async function insertActivity(client: SupabaseClient, userId: string, action: string, description: string, result: Activity["result"] = "success") {
  await requireOk(
    client.from("activity_logs").insert({
      user_id: userId,
      action,
      entity_type: "myos",
      description: description.slice(0, 200),
      result
    }),
    "保存活动记录"
  );
}

async function insertAgentWorkEvent(client: SupabaseClient, userId: string, input: Omit<AgentWorkEvent, "id" | "createdAt"> & { metadata?: Record<string, unknown> }) {
  await requireOk(
    client.from("agent_work_events").insert({
      user_id: userId,
      project_id: input.projectId,
      work_item_id: input.workItemId,
      agent_id: input.agentId,
      event_type: input.eventType,
      progress: input.progress,
      message: input.message,
      metadata: input.metadata || {}
    }),
    "保存 Agent 执行事件"
  );
}

async function syncSupabaseData(client: SupabaseClient, userId: string, data: MyOSData) {
  await deleteUserRows(client, userId);

  if (data.lifeAreas.length) {
    await requireOk(
      client.from("life_areas").insert(
        data.lifeAreas.map((area) => ({
          id: area.id,
          user_id: userId,
          name: area.name,
          description: area.description,
          icon: area.icon,
          display_order: area.displayOrder,
          status: area.status,
          privacy_level: area.privacyLevel
        }))
      ),
      "保存人生领域"
    );
  }

  if (data.goals.length) {
    await requireOk(
      client.from("goals").insert(
        data.goals.map((goal) => ({
          id: goal.id,
          user_id: userId,
          life_area_id: goal.lifeAreaId || null,
          title: goal.title,
          description: goal.description,
          motivation: goal.motivation,
          success_criteria: goal.successCriteria,
          status: goal.status,
          priority: goal.priority,
          start_date: dateOnly(goal.startDate),
          target_date: dateOnly(goal.targetDate),
          manual_progress: goal.manualProgress,
          progress_mode: goal.progressMode,
          next_action: goal.nextAction,
          abandon_conditions: goal.abandonConditions,
          privacy_level: goal.privacyLevel,
          archived_at: goal.archivedAt
        }))
      ),
      "保存目标"
    );
  }

  if (data.projects.length) {
    await requireOk(
      client.from("projects").insert(
        data.projects.map((project) => ({
          id: project.id,
          user_id: userId,
          goal_id: project.goalId ?? null,
          name: project.name,
          slug: `${slugify(project.name)}-${project.id.slice(0, 8)}`,
          status: project.status,
          category: project.category,
          local_path: project.path,
          next_action: project.nextAction,
          favorite: project.favorite,
          agent_summary: project.summary ?? null,
          tech_stack: project.techStack ?? [],
          agent_progress_mode: project.progressMode ?? "agent_work",
          agent_manual_progress: project.manualProgress ?? 0
        }))
      ),
      "保存项目"
    );
  }

  if (data.projectMilestones.length) {
    await requireOk(
      client.from("project_milestones").insert(data.projectMilestones.map((milestone) => ({
        id: milestone.id,
        user_id: userId,
        project_id: milestone.projectId,
        title: milestone.title,
        description: milestone.description,
        status: milestone.status,
        target_date: dateOnly(milestone.targetDate),
        progress: milestone.progress
      }))),
      "保存项目里程碑"
    );
  }

  if (data.projectRisks.length) {
    await requireOk(
      client.from("project_risks").insert(data.projectRisks.map((risk) => ({
        id: risk.id,
        user_id: userId,
        project_id: risk.projectId,
        title: risk.title,
        severity: risk.severity,
        status: risk.status,
        mitigation: risk.mitigation
      }))),
      "保存项目风险"
    );
  }

  if (data.agentAssignments.length) {
    await requireOk(
      client.from("project_agent_assignments").insert(
        data.agentAssignments.map((assignment) => ({
          id: assignment.id,
          user_id: userId,
          project_id: assignment.projectId,
          agent_id: assignment.agentId,
          role: assignment.role
        }))
      ),
      "保存 Agent 分配"
    );
  }

  if (data.agentWorkItems.length) {
    await requireOk(
      client.from("agent_work_items").insert(
        data.agentWorkItems.map((item) => ({
          id: item.id,
          user_id: userId,
          project_id: item.projectId,
          agent_id: item.agentId,
          title: item.title,
          instructions: item.instructions,
          status: item.status,
          progress: item.progress,
          last_heartbeat_at: item.lastHeartbeatAt || null,
          started_at: item.startedAt || null,
          completed_at: item.completedAt || null,
          blocked_reason: item.blockedReason || null,
          result: item.result || null,
          changed_files: item.changedFiles || [],
          test_result: item.testResult || null,
          artifact_url: item.artifactUrl || null,
          failure_count: item.failureCount
        }))
      ),
      "保存 Agent 工作项"
    );
  }

  if (data.agentReports.length) {
    await requireOk(
      client.from("agent_reports").insert(
        data.agentReports.map((report) => ({
          id: report.id,
          user_id: userId,
          project_id: report.projectId,
          work_item_id: report.workItemId ?? null,
          agent_id: report.agentId,
          summary: report.summary,
          progress: report.progress,
          blocked_reason: report.blockedReason || null,
          changed_files: report.changedFiles || [],
          test_result: report.testResult || null,
          artifact_url: report.artifactUrl || null
        }))
      ),
      "保存 Agent 汇报"
    );
  }

  if (data.agentWorkEvents.length) {
    await requireOk(
      client.from("agent_work_events").insert(data.agentWorkEvents.map((event) => ({
        id: event.id,
        user_id: userId,
        project_id: event.projectId,
        work_item_id: event.workItemId,
        agent_id: event.agentId,
        event_type: event.eventType,
        progress: event.progress,
        message: event.message
      }))),
      "保存 Agent 执行历史"
    );
  }

  if (data.tasks.length) {
    await requireOk(
      client.from("project_tasks").insert(
        data.tasks.map((task) => ({
          id: task.id,
          user_id: userId,
          goal_id: task.goalId ?? null,
          title: task.title,
          status: task.done ? "completed" : task.status ?? "planned",
          priority: task.priority,
          project_name: task.project,
          due_text: task.due,
          planned_date: dateOnly(task.plannedDate),
          due_date: dateOnly(task.dueDate),
          estimated_minutes: task.estimatedMinutes,
          actual_minutes: task.actualMinutes,
          today_focus: task.todayFocus ?? false,
          recurrence_rule: task.recurrenceRule
        }))
      ),
      "保存任务"
    );
  }

  if (data.inbox.length) {
    await requireOk(
      client.from("inbox_items").insert(
        data.inbox.map((item) => ({
          id: item.id,
          user_id: userId,
          title: item.title,
          item_type: item.type,
          category: item.category,
          status: item.status
        }))
      ),
      "保存收件箱"
    );
  }

  if (data.prompts.length) {
    await requireOk(
      client.from("prompts").insert(
        data.prompts.map((prompt) => ({
          id: prompt.id,
          user_id: userId,
          title: prompt.title,
          category: prompt.category,
          content: prompt.content,
          recommended_model: prompt.model,
          favorite: prompt.favorite,
          use_count: prompt.useCount
        }))
      ),
      "保存提示词"
    );
  }

  if (data.notes.length) {
    await requireOk(
      client.from("notes").insert(
        data.notes.map((note) => ({
          id: note.id,
          user_id: userId,
          title: note.title,
          note_type: note.type,
          summary: note.summary,
          favorite: note.favorite
        }))
      ),
      "保存知识笔记"
    );
  }

  if (data.files.length) {
    await requireOk(
      client.from("files").insert(
        data.files.map((file) => ({
          id: file.id,
          user_id: userId,
          filename: file.name,
          original_filename: file.name,
          file_type: file.kind,
          mime_type: "application/octet-stream",
          size_bytes: 0,
          display_size: file.size,
          storage_path: `placeholder/${file.id}`
        }))
      ),
      "保存文件记录"
    );
  }

  if (data.habits.length) {
    await requireOk(
      client.from("habits").insert(
        data.habits.map((habit) => ({
          id: habit.id,
          user_id: userId,
          life_area_id: habit.lifeAreaId ?? null,
          goal_id: habit.goalId ?? null,
          name: habit.name,
          description: habit.description,
          frequency_type: habit.frequencyType,
          recurrence_rule: habit.recurrenceRule,
          target_value: habit.targetValue,
          unit: habit.unit,
          reminder_time: habit.reminderTime,
          status: habit.status,
          privacy_level: habit.privacyLevel
        }))
      ),
      "保存习惯"
    );
  }

  if (data.habitLogs.length) {
    await requireOk(
      client.from("habit_logs").insert(
        data.habitLogs.map((log) => ({
          id: log.id,
          user_id: userId,
          habit_id: log.habitId,
          log_date: dateOnly(log.logDate),
          status: log.status,
          value: log.value,
          note: log.note,
          completed_at: log.completedAt
        }))
      ),
      "保存习惯记录"
    );
  }

  if (data.routines.length) {
    await requireOk(
      client.from("routines").insert(
        data.routines.map((routine) => ({
          id: routine.id,
          user_id: userId,
          life_area_id: routine.lifeAreaId ?? null,
          name: routine.name,
          description: routine.description,
          schedule_type: routine.scheduleType,
          recurrence_rule: routine.recurrenceRule,
          status: routine.status,
          privacy_level: routine.privacyLevel
        }))
      ),
      "保存例程"
    );
  }

  if (data.routineSteps.length) {
    await requireOk(
      client.from("routine_steps").insert(
        data.routineSteps.map((step) => ({
          id: step.id,
          user_id: userId,
          routine_id: step.routineId,
          title: step.title,
          display_order: step.displayOrder,
          estimated_minutes: step.estimatedMinutes
        }))
      ),
      "保存例程步骤"
    );
  }

  if (data.routineLogs.length) {
    await requireOk(
      client.from("routine_logs").insert(
        data.routineLogs.map((log) => ({
          id: log.id,
          user_id: userId,
          routine_id: log.routineId,
          log_date: dateOnly(log.logDate),
          status: log.status,
          completed_step_ids: log.completedStepIds,
          note: log.note
        }))
      ),
      "保存例程记录"
    );
  }

  if (data.dailyCheckins.length) {
    await requireOk(
      client.from("daily_checkins").insert(
        data.dailyCheckins.map((item) => ({
          id: item.id,
          user_id: userId,
          checkin_date: dateOnly(item.date),
          sleep_at: item.sleepAt,
          wake_at: item.wakeAt,
          sleep_hours: item.sleepHours,
          sleep_quality: item.sleepQuality,
          energy: item.energy,
          mood: item.mood,
          stress: item.stress,
          exercise: item.exercise,
          study_minutes: item.studyMinutes,
          work_minutes: item.workMinutes,
          note: item.note,
          privacy_level: item.privacyLevel
        }))
      ),
      "保存每日记录"
    );
  }

  if (data.dailyReviews.length) {
    await requireOk(
      client.from("daily_reviews").insert(
        data.dailyReviews.map((item) => ({
          id: item.id,
          user_id: userId,
          review_date: dateOnly(item.date),
          completed: item.completed,
          problems: item.problems,
          state: item.state,
          tomorrow_focus: item.tomorrowFocus,
          privacy_level: item.privacyLevel
        }))
      ),
      "保存每日复盘"
    );
  }

  if (data.weeklyReviews.length) {
    await requireOk(
      client.from("weekly_reviews").insert(
        data.weeklyReviews.map((item) => ({
          id: item.id,
          user_id: userId,
          week_start: dateOnly(item.weekStart),
          completed_task_ids: item.completedTaskIds,
          unfinished_task_ids: item.unfinishedTaskIds,
          project_changes: item.projectChanges,
          goal_progress: item.goalProgress,
          habit_completion_rate: item.habitCompletionRate,
          study_minutes: item.studyMinutes,
          sleep_trend: item.sleepTrend,
          mood_trend: item.moodTrend,
          spending_summary_placeholder: item.spendingSummaryPlaceholder,
          next_week_focus: item.nextWeekFocus,
          privacy_level: item.privacyLevel
        }))
      ),
      "保存每周复盘"
    );
  }

  if (data.automations.length) {
    await requireOk(
      client.from("automation_workflows").insert(
        data.automations.map((automation) => ({
          id: automation.id,
          user_id: userId,
          name: automation.name,
          status: automation.status,
          last_run_label: automation.lastRun,
          next_run_label: automation.nextRun
        }))
      ),
      "保存自动化配置"
    );
  }

  if (data.activities.length) {
    await requireOk(
      client.from("activity_logs").insert(
        data.activities.map((activity) => ({
          id: activity.id,
          user_id: userId,
          action: activity.action,
          entity_type: "myos",
          description: activity.detail,
          result: activity.result
        }))
      ),
      "保存活动记录"
    );
  }
}

async function createContext(session: MyOSSession) {
  const client = createSupabaseAdminClient();
  const userId = await resolveOwnerUserId(client, session);
  await ensureProfile(client, userId, session.email);
  await seedIfEmpty(client, userId);
  return { client, userId };
}

export async function readMyOSDataFromSupabase(session: MyOSSession) {
  const { client, userId } = await createContext(session);
  return await readSupabaseData(client, userId);
}

export async function applyMyOSActionToSupabase(session: MyOSSession, action: MyOSAction) {
  const { client, userId } = await createContext(session);

  switch (action.type) {
    case "addProject":
      await requireOk(
        client.from("projects").insert({
          user_id: userId,
          goal_id: action.payload.goalId ?? null,
          name: action.payload.name,
          slug: `${slugify(action.payload.name)}-${randomUUID().slice(0, 8)}`,
          status: "active",
          category: action.payload.category,
          local_path: "~/dev/new-project",
          next_action: action.payload.nextAction,
          favorite: false
        }),
        "创建项目"
      );
      await insertActivity(client, userId, "创建项目", action.payload.name);
      break;
    case "updateProject":
      await requireOk(
        client
          .from("projects")
          .update({
            goal_id: action.payload.goalId ?? null,
            name: action.payload.name,
            status: action.payload.status,
            category: action.payload.category,
            next_action: action.payload.nextAction,
            favorite: action.payload.favorite,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", userId)
          .eq("id", action.payload.id)
          .select("id")
          .single(),
        "更新项目"
      );
      await insertActivity(client, userId, "更新项目", action.payload.name);
      break;
    case "deleteProject": {
      const project = await requireOk(
        client.from("projects").select("name").eq("user_id", userId).eq("id", action.payload.id).single(),
        "读取项目"
      );
      await requireOk(client.from("projects").delete().eq("user_id", userId).eq("id", action.payload.id), "删除项目");
      await insertActivity(client, userId, "删除项目", text((project as Row).name, "项目"));
      break;
    }
    case "updateProjectAgentProfile":
      {
        const project = await requireOk(
          client.from("projects").select("id,name").eq("user_id", userId).eq("id", action.payload.projectId).single(),
          "读取项目"
        ) as Row;
        await requireOk(
          client.from("projects").update({
            agent_summary: action.payload.summary,
            tech_stack: action.payload.techStack,
            agent_progress_mode: action.payload.progressMode,
            agent_manual_progress: action.payload.manualProgress,
            updated_at: new Date().toISOString()
          }).eq("user_id", userId).eq("id", action.payload.projectId).select("id").single(),
          "更新项目 Agent 信息"
        );
        await insertActivity(client, userId, "更新项目 Agent 信息", text(project.name, "项目"));
        break;
      }
    case "addProjectMilestone":
      await requireOk(
        client.from("project_milestones").insert({
          user_id: userId,
          project_id: action.payload.projectId,
          title: action.payload.title,
          description: action.payload.description,
          status: action.payload.status,
          target_date: dateOnly(action.payload.targetDate),
          progress: action.payload.progress
        }),
        "创建项目里程碑"
      );
      await insertActivity(client, userId, "创建项目里程碑", action.payload.title);
      break;
    case "updateProjectMilestone":
      await requireOk(
        client.from("project_milestones").update({
          title: action.payload.title,
          description: action.payload.description,
          status: action.payload.status,
          target_date: dateOnly(action.payload.targetDate),
          progress: action.payload.progress,
          updated_at: new Date().toISOString()
        }).eq("user_id", userId).eq("id", action.payload.id).select("id").single(),
        "更新项目里程碑"
      );
      await insertActivity(client, userId, "更新项目里程碑", action.payload.title);
      break;
    case "deleteProjectMilestone": {
      const milestone = await requireOk(client.from("project_milestones").select("title").eq("user_id", userId).eq("id", action.payload.id).single(), "读取项目里程碑");
      await requireOk(client.from("project_milestones").delete().eq("user_id", userId).eq("id", action.payload.id), "删除项目里程碑");
      await insertActivity(client, userId, "删除项目里程碑", text((milestone as Row).title, "里程碑"));
      break;
    }
    case "addProjectRisk":
      await requireOk(
        client.from("project_risks").insert({ user_id: userId, project_id: action.payload.projectId, title: action.payload.title, severity: action.payload.severity, status: action.payload.status, mitigation: action.payload.mitigation }),
        "记录项目风险"
      );
      await insertActivity(client, userId, "记录项目风险", action.payload.title, action.payload.severity === "high" ? "warning" : "success");
      break;
    case "updateProjectRisk":
      await requireOk(
        client.from("project_risks").update({ title: action.payload.title, severity: action.payload.severity, status: action.payload.status, mitigation: action.payload.mitigation, updated_at: new Date().toISOString() }).eq("user_id", userId).eq("id", action.payload.id).select("id").single(),
        "更新项目风险"
      );
      await insertActivity(client, userId, "更新项目风险", action.payload.title);
      break;
    case "deleteProjectRisk": {
      const risk = await requireOk(client.from("project_risks").select("title").eq("user_id", userId).eq("id", action.payload.id).single(), "读取项目风险");
      await requireOk(client.from("project_risks").delete().eq("user_id", userId).eq("id", action.payload.id), "删除项目风险");
      await insertActivity(client, userId, "删除项目风险", text((risk as Row).title, "风险"));
      break;
    }
    case "assignProjectAgent":
      {
        const project = await requireOk(
          client.from("projects").select("id,name").eq("user_id", userId).eq("id", action.payload.projectId).single(),
          "读取项目"
        ) as Row;
        await requireOk(
          client.from("project_agent_assignments").upsert({
            user_id: userId,
            project_id: action.payload.projectId,
            agent_id: action.payload.agentId,
            role: action.payload.role
          }, { onConflict: "user_id,project_id,agent_id" }),
          "分配项目 Agent"
        );
        await insertActivity(client, userId, "分配项目 Agent", `${text(project.name, "项目")} / ${action.payload.agentId}`);
        break;
      }
    case "addAgentWorkItem":
      {
        const project = await requireOk(
          client.from("projects").select("id,name").eq("user_id", userId).eq("id", action.payload.projectId).single(),
          "读取项目"
        ) as Row;
        const workItemId = randomUUID();
        await requireOk(
          client.from("agent_work_items").insert({
            id: workItemId,
            user_id: userId,
            project_id: action.payload.projectId,
            agent_id: action.payload.agentId,
            title: action.payload.title,
            instructions: action.payload.instructions,
            status: "queued",
            progress: 0,
            failure_count: 0
          }),
          "创建 Agent 工作项"
        );
        await insertAgentWorkEvent(client, userId, { projectId: action.payload.projectId, workItemId, agentId: action.payload.agentId, eventType: "queued", progress: 0, message: "工作项已加入 Agent 队列。" });
        await insertActivity(client, userId, "创建 Agent 工作项", `${text(project.name, "项目")} / ${action.payload.title}`);
        break;
      }
    case "updateAgentWorkItem":
      {
        const workItem = await requireOk(
          client.from("agent_work_items").select("id,title,project_id,agent_id,status,started_at,completed_at").eq("user_id", userId).eq("id", action.payload.id).single(),
          "读取 Agent 工作项"
        ) as Row;
        const progress = action.payload.status === "completed" ? 100 : action.payload.progress;
        const eventType = action.payload.status === "completed" ? "completed" : action.payload.status === "blocked" ? "blocked" : action.payload.status === "in_progress" && text(workItem.status) === "queued" ? "started" : "progress";
        const now = new Date().toISOString();
        await requireOk(
          client.from("agent_work_items").update({
            status: action.payload.status,
            progress,
            blocked_reason: action.payload.blockedReason ?? null,
            result: action.payload.result ?? null,
            changed_files: action.payload.changedFiles ?? [],
            test_result: action.payload.testResult ?? null,
            artifact_url: action.payload.artifactUrl || null,
            last_heartbeat_at: now,
            started_at: action.payload.status === "in_progress" ? text(workItem.started_at, now) : text(workItem.started_at) || null,
            completed_at: action.payload.status === "completed" ? text(workItem.completed_at, now) : text(workItem.completed_at) || null,
            updated_at: now
          })
            .eq("user_id", userId).eq("id", action.payload.id).select("id").single(),
          "更新 Agent 工作项"
        );
        await insertAgentWorkEvent(client, userId, { projectId: text(workItem.project_id), workItemId: text(workItem.id), agentId: text(workItem.agent_id), eventType: eventType as AgentWorkEvent["eventType"], progress, message: action.payload.eventMessage || action.payload.blockedReason || action.payload.result || "工作项状态已更新。" });
        await insertActivity(client, userId, "更新 Agent 工作项", text(workItem.title, "工作项"));
        break;
      }
    case "addAgentReport":
      {
        const project = await requireOk(
          client.from("projects").select("id,name").eq("user_id", userId).eq("id", action.payload.projectId).single(),
          "读取项目"
        ) as Row;
        if (action.payload.workItemId) {
          await requireOk(
            client.from("agent_work_items").select("id").eq("user_id", userId).eq("project_id", action.payload.projectId).eq("id", action.payload.workItemId).single(),
            "读取 Agent 工作项"
          );
        }
        await requireOk(
          client.from("agent_reports").insert({
            user_id: userId,
            project_id: action.payload.projectId,
            work_item_id: action.payload.workItemId || null,
            agent_id: action.payload.agentId,
            summary: action.payload.summary,
            progress: action.payload.progress,
            blocked_reason: action.payload.blockedReason || null,
            changed_files: action.payload.changedFiles || [],
            test_result: action.payload.testResult || null,
            artifact_url: action.payload.artifactUrl || null
          }),
          "保存 Agent 汇报"
        );
        if (action.payload.workItemId) {
          const nextStatus = action.payload.status || (action.payload.progress >= 100 ? "completed" : "in_progress");
          const now = new Date().toISOString();
          await requireOk(
            client.from("agent_work_items").update({ progress: action.payload.progress, status: nextStatus, blocked_reason: action.payload.blockedReason || null, changed_files: action.payload.changedFiles || [], test_result: action.payload.testResult || null, artifact_url: action.payload.artifactUrl || null, last_heartbeat_at: now, completed_at: nextStatus === "completed" ? now : null, updated_at: now })
              .eq("user_id", userId).eq("project_id", action.payload.projectId).eq("id", action.payload.workItemId).select("id").single(),
            "更新 Agent 工作项进度"
          );
          const workItem = await requireOk(client.from("agent_work_items").select("agent_id").eq("user_id", userId).eq("id", action.payload.workItemId).single(), "读取 Agent 工作项") as Row;
          await insertAgentWorkEvent(client, userId, { projectId: action.payload.projectId, workItemId: action.payload.workItemId, agentId: text(workItem.agent_id, action.payload.agentId), eventType: "report", progress: action.payload.progress, message: action.payload.summary });
        }
        await insertActivity(client, userId, "提交 Agent 汇报", `${text(project.name, "项目")} / ${action.payload.agentId}`);
        break;
      }
    case "toggleTask": {
      const task = await requireOk(
        client.from("project_tasks").select("status").eq("user_id", userId).eq("id", action.payload.id).single(),
        "读取任务"
      );
      const nextStatus = text((task as Row).status) === "completed" ? "planned" : "completed";
      await requireOk(
        client.from("project_tasks").update({ status: nextStatus, updated_at: new Date().toISOString() }).eq("user_id", userId).eq("id", action.payload.id).select("id").single(),
        "更新任务"
      );
      break;
    }
    case "addTask": {
      const current = await readSupabaseData(client, userId);
      const todayFocusCount = current.tasks.filter((task) => task.todayFocus && !task.done).length;
      await requireOk(
        client.from("project_tasks").insert({
          user_id: userId,
          goal_id: action.payload.goalId ?? null,
          title: action.payload.title,
          status: "planned",
          priority: action.payload.priority,
          project_name: action.payload.project,
          due_text: action.payload.due || "今天",
          planned_date: dateOnly(action.payload.plannedDate || "today"),
          today_focus: Boolean(action.payload.todayFocus && todayFocusCount < 3)
        }),
        "创建任务"
      );
      await insertActivity(client, userId, "创建任务", action.payload.title);
      break;
    }
    case "updateTask":
      await requireOk(
        client
          .from("project_tasks")
          .update({
            goal_id: action.payload.goalId ?? null,
            title: action.payload.title,
            status: action.payload.status || "planned",
            priority: action.payload.priority,
            project_name: action.payload.project,
            due_text: action.payload.due || "今天",
            planned_date: dateOnly(action.payload.plannedDate || "today"),
            today_focus: Boolean(action.payload.todayFocus),
            updated_at: new Date().toISOString()
          })
          .eq("user_id", userId)
          .eq("id", action.payload.id)
          .select("id")
          .single(),
        "更新任务"
      );
      await insertActivity(client, userId, "更新任务", action.payload.title);
      break;
    case "deleteTask": {
      const task = await requireOk(
        client.from("project_tasks").select("title").eq("user_id", userId).eq("id", action.payload.id).single(),
        "读取任务"
      );
      await requireOk(client.from("project_tasks").delete().eq("user_id", userId).eq("id", action.payload.id), "删除任务");
      await insertActivity(client, userId, "删除任务", text((task as Row).title, "任务"));
      break;
    }
    case "addInbox":
      await requireOk(
        client.from("inbox_items").insert({
          user_id: userId,
          title: action.payload.title,
          item_type: action.payload.type,
          category: action.payload.category,
          status: "pending"
        }),
        "创建收件箱记录"
      );
      break;
    case "updateInbox":
      await requireOk(
        client
          .from("inbox_items")
          .update({
            title: action.payload.title,
            item_type: action.payload.type,
            category: action.payload.category,
            status: action.payload.status,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", userId)
          .eq("id", action.payload.id)
          .select("id")
          .single(),
        "更新收件箱记录"
      );
      await insertActivity(client, userId, "更新收件箱", action.payload.title);
      break;
    case "deleteInbox": {
      const item = await requireOk(
        client.from("inbox_items").select("title").eq("user_id", userId).eq("id", action.payload.id).single(),
        "读取收件箱记录"
      );
      await requireOk(client.from("inbox_items").delete().eq("user_id", userId).eq("id", action.payload.id), "删除收件箱记录");
      await insertActivity(client, userId, "删除收件箱", text((item as Row).title, "收件箱记录"));
      break;
    }
    case "addPrompt":
      await requireOk(
        client.from("prompts").insert({
          user_id: userId,
          title: action.payload.title,
          category: action.payload.category,
          content: action.payload.content,
          recommended_model: "gpt-5",
          favorite: false,
          use_count: 0
        }),
        "创建提示词"
      );
      break;
    case "updatePrompt":
      await requireOk(
        client
          .from("prompts")
          .update({
            title: action.payload.title,
            category: action.payload.category,
            content: action.payload.content,
            favorite: action.payload.favorite,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", userId)
          .eq("id", action.payload.id)
          .select("id")
          .single(),
        "更新提示词"
      );
      await insertActivity(client, userId, "更新提示词", action.payload.title);
      break;
    case "deletePrompt": {
      const prompt = await requireOk(
        client.from("prompts").select("title").eq("user_id", userId).eq("id", action.payload.id).single(),
        "读取提示词"
      );
      await requireOk(client.from("prompts").delete().eq("user_id", userId).eq("id", action.payload.id), "删除提示词");
      await insertActivity(client, userId, "删除提示词", text((prompt as Row).title, "提示词"));
      break;
    }
    case "addNote":
      await requireOk(
        client.from("notes").insert({
          user_id: userId,
          title: action.payload.title,
          note_type: action.payload.type,
          summary: action.payload.summary,
          favorite: false
        }),
        "创建知识笔记"
      );
      break;
    case "updateNote":
      await requireOk(
        client
          .from("notes")
          .update({
            title: action.payload.title,
            note_type: action.payload.type,
            summary: action.payload.summary,
            favorite: action.payload.favorite,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", userId)
          .eq("id", action.payload.id)
          .select("id")
          .single(),
        "更新知识笔记"
      );
      await insertActivity(client, userId, "更新知识", action.payload.title);
      break;
    case "deleteNote": {
      const note = await requireOk(
        client.from("notes").select("title").eq("user_id", userId).eq("id", action.payload.id).single(),
        "读取知识笔记"
      );
      await requireOk(client.from("notes").delete().eq("user_id", userId).eq("id", action.payload.id), "删除知识笔记");
      await insertActivity(client, userId, "删除知识", text((note as Row).title, "知识"));
      break;
    }
    case "addFileRecord":
      await requireOk(
        client.from("files").insert({
          user_id: userId,
          filename: action.payload.name,
          original_filename: action.payload.name,
          file_type: action.payload.kind,
          mime_type: action.payload.mimeType || "application/octet-stream",
          size_bytes: Number.parseInt(action.payload.size || "0", 10) || 0,
          display_size: action.payload.size || "未知",
          storage_path: action.payload.storagePath || `manual/${randomUUID()}`,
          category: action.payload.project || "未关联",
          source_url: action.payload.sourceUrl || null
        }),
        "登记文件"
      );
      await insertActivity(client, userId, "登记文件", action.payload.name);
      break;
    case "deleteFile": {
      const file = await requireOk(
        client.from("files").select("original_filename").eq("user_id", userId).eq("id", action.payload.id).single(),
        "读取文件"
      );
      await requireOk(client.from("files").delete().eq("user_id", userId).eq("id", action.payload.id), "删除文件");
      await insertActivity(client, userId, "删除文件", text((file as Row).original_filename, "文件"));
      break;
    }
    case "addLifeArea":
      await requireOk(
        client.from("life_areas").insert({
          user_id: userId,
          name: action.payload.name,
          description: action.payload.description,
          icon: action.payload.icon,
          display_order: (await readSupabaseData(client, userId)).lifeAreas.length + 1,
          status: "active",
          privacy_level: action.payload.privacyLevel
        }),
        "创建人生领域"
      );
      await insertActivity(client, userId, "创建人生领域", action.payload.name);
      break;
    case "updateLifeAreaStatus":
      await requireOk(
        client.from("life_areas").update({ status: action.payload.status, updated_at: new Date().toISOString() }).eq("user_id", userId).eq("id", action.payload.id).select("id").single(),
        "更新人生领域"
      );
      break;
    case "addGoal":
      await requireOk(
        client.from("goals").insert({
          user_id: userId,
          life_area_id: action.payload.lifeAreaId,
          title: action.payload.title,
          description: action.payload.description,
          motivation: action.payload.motivation,
          success_criteria: action.payload.successCriteria,
          status: "active",
          priority: action.payload.priority,
          start_date: new Date().toISOString().slice(0, 10),
          target_date: dateOnly(action.payload.targetDate),
          manual_progress: 0,
          progress_mode: action.payload.progressMode,
          next_action: action.payload.nextAction,
          privacy_level: action.payload.privacyLevel
        }),
        "创建目标"
      );
      await insertActivity(client, userId, "创建目标", action.payload.title);
      break;
    case "updateGoalProgress":
      await requireOk(
        client
          .from("goals")
          .update({
            manual_progress: action.payload.manualProgress,
            progress_mode: action.payload.progressMode,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", userId)
          .eq("id", action.payload.id)
          .select("id")
          .single(),
        "更新目标进度"
      );
      break;
    case "addHabit":
      await requireOk(
        client.from("habits").insert({
          user_id: userId,
          life_area_id: action.payload.lifeAreaId ?? null,
          goal_id: action.payload.goalId ?? null,
          name: action.payload.name,
          description: action.payload.description,
          frequency_type: action.payload.frequencyType,
          target_value: action.payload.targetValue,
          unit: action.payload.unit,
          reminder_time: action.payload.reminderTime,
          status: "active",
          privacy_level: action.payload.privacyLevel
        }),
        "创建习惯"
      );
      await insertActivity(client, userId, "创建习惯", action.payload.name);
      break;
    case "logHabit":
      await requireOk(
        client.from("habit_logs").upsert(
          {
            user_id: userId,
            habit_id: action.payload.habitId,
            log_date: dateOnly("today"),
            status: action.payload.status,
            value: action.payload.value,
            note: action.payload.note,
            completed_at: action.payload.status === "completed" ? new Date().toISOString() : null
          },
          { onConflict: "user_id,habit_id,log_date" }
        ),
        "保存习惯记录"
      );
      await insertActivity(client, userId, "记录习惯", action.payload.habitId);
      break;
    case "logRoutine":
      await requireOk(
        client.from("routine_logs").upsert(
          {
            user_id: userId,
            routine_id: action.payload.routineId,
            log_date: dateOnly("today"),
            status: action.payload.status,
            completed_step_ids: action.payload.completedStepIds
          },
          { onConflict: "user_id,routine_id,log_date" }
        ),
        "保存例程记录"
      );
      await insertActivity(client, userId, "记录例程", action.payload.routineId);
      break;
    case "saveDailyCheckin":
      await requireOk(
        client.from("daily_checkins").upsert(
          {
            user_id: userId,
            checkin_date: dateOnly(action.payload.date),
            sleep_at: action.payload.sleepAt,
            wake_at: action.payload.wakeAt,
            sleep_hours: action.payload.sleepHours,
            sleep_quality: action.payload.sleepQuality,
            energy: action.payload.energy,
            mood: action.payload.mood,
            stress: action.payload.stress,
            exercise: action.payload.exercise,
            study_minutes: action.payload.studyMinutes,
            work_minutes: action.payload.workMinutes,
            note: action.payload.note,
            privacy_level: "sensitive",
            updated_at: new Date().toISOString()
          },
          { onConflict: "user_id,checkin_date" }
        ),
        "保存每日记录"
      );
      await insertActivity(client, userId, "保存每日记录", action.payload.date);
      break;
    case "saveDailyReview":
      await requireOk(
        client.from("daily_reviews").upsert(
          {
            user_id: userId,
            review_date: dateOnly(action.payload.date),
            completed: action.payload.completed,
            problems: action.payload.problems,
            state: action.payload.state,
            tomorrow_focus: action.payload.tomorrowFocus,
            privacy_level: "sensitive",
            updated_at: new Date().toISOString()
          },
          { onConflict: "user_id,review_date" }
        ),
        "保存每日复盘"
      );
      await insertActivity(client, userId, "保存每日复盘", action.payload.date);
      break;
    case "saveWeeklyReview":
      await requireOk(
        client.from("weekly_reviews").upsert(
          {
            user_id: userId,
            week_start: dateOnly(action.payload.weekStart),
            completed_task_ids: action.payload.completedTaskIds,
            unfinished_task_ids: action.payload.unfinishedTaskIds,
            project_changes: action.payload.projectChanges,
            goal_progress: action.payload.goalProgress,
            habit_completion_rate: action.payload.habitCompletionRate,
            study_minutes: action.payload.studyMinutes,
            sleep_trend: action.payload.sleepTrend,
            mood_trend: action.payload.moodTrend,
            spending_summary_placeholder: action.payload.spendingSummaryPlaceholder,
            next_week_focus: action.payload.nextWeekFocus,
            privacy_level: "sensitive",
            updated_at: new Date().toISOString()
          },
          { onConflict: "user_id,week_start" }
        ),
        "保存每周复盘"
      );
      await insertActivity(client, userId, "保存每周复盘", action.payload.weekStart);
      break;
    case "resetData":
      await deleteUserRows(client, userId);
      await requireOk(
        client.from("profiles").update({ myos_seeded_at: null, updated_at: new Date().toISOString() }).eq("id", userId),
        "清除 owner 初始化状态"
      );
      await seedIfEmpty(client, userId);
      break;
  }

  return await readSupabaseData(client, userId);
}

export async function replaceMyOSDataInSupabase(session: MyOSSession, data: MyOSData) {
  const { client, userId } = await createContext(session);
  await syncSupabaseData(client, userId, data);
  await insertActivity(client, userId, "导入备份", "从 JSON 备份恢复 MyOS 数据");
  return await readSupabaseData(client, userId);
}
