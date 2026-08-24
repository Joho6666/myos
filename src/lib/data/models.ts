export type Status = "planned" | "active" | "paused" | "done" | "archived";
export type Priority = "high" | "medium" | "low";
export type PrivacyLevel = "normal" | "sensitive" | "vault";

export type Project = {
  id: string;
  goalId?: string;
  name: string;
  category: string;
  status: Status;
  path: string;
  nextAction: string;
  updatedAt: string;
  favorite: boolean;
  summary?: string;
  techStack?: string[];
  progressMode?: "manual" | "agent_work";
  manualProgress?: number;
};

export type ProjectMilestone = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: "planned" | "in_progress" | "completed" | "blocked";
  targetDate?: string;
  progress: number;
  updatedAt: string;
};

export type ProjectRisk = {
  id: string;
  projectId: string;
  title: string;
  severity: "low" | "medium" | "high";
  status: "open" | "mitigated" | "accepted";
  mitigation: string;
  updatedAt: string;
};

export type AgentAssignment = {
  id: string;
  projectId: string;
  agentId: string;
  role: string;
  createdAt: string;
};

export type AgentWorkItem = {
  id: string;
  projectId: string;
  agentId: string;
  title: string;
  instructions: string;
  status: "queued" | "in_progress" | "blocked" | "completed";
  progress: number;
  updatedAt: string;
  lastHeartbeatAt?: string;
  startedAt?: string;
  completedAt?: string;
  blockedReason?: string;
  result?: string;
  changedFiles?: string[];
  testResult?: string;
  artifactUrl?: string;
  failureCount: number;
};

export type AgentReport = {
  id: string;
  projectId: string;
  workItemId?: string;
  agentId: string;
  summary: string;
  progress: number;
  createdAt: string;
  blockedReason?: string;
  changedFiles?: string[];
  testResult?: string;
  artifactUrl?: string;
};

export type AgentWorkEvent = {
  id: string;
  projectId: string;
  workItemId: string;
  agentId: string;
  eventType: "queued" | "started" | "heartbeat" | "progress" | "blocked" | "completed" | "failed" | "report";
  progress: number;
  message: string;
  createdAt: string;
};

export type Task = {
  id: string;
  goalId?: string;
  title: string;
  project?: string;
  priority: Priority;
  due: string;
  plannedDate?: string;
  dueDate?: string;
  estimatedMinutes?: number;
  actualMinutes?: number;
  status?: "inbox" | "planned" | "in_progress" | "completed" | "cancelled" | "archived";
  todayFocus?: boolean;
  recurrenceRule?: "daily" | "weekdays" | "weekly" | "monthly";
  reminderTime?: string;
  done: boolean;
};

export type InboxItem = {
  id: string;
  title: string;
  type: "text" | "file" | "link" | "idea";
  category: string;
  status: "pending" | "classified" | "archived";
  createdAt: string;
};

export type Prompt = {
  id: string;
  title: string;
  category: string;
  model: string;
  content: string;
  favorite: boolean;
  useCount: number;
  updatedAt: string;
};

export type Note = {
  id: string;
  title: string;
  type: string;
  summary: string;
  updatedAt: string;
  favorite: boolean;
};

export type FileRecord = {
  id: string;
  name: string;
  kind: string;
  project: string;
  size: string;
  mimeType?: string;
  sourceUrl?: string;
  storagePath?: string;
  updatedAt: string;
};

export type Activity = {
  id: string;
  action: string;
  detail: string;
  time: string;
  result: "success" | "warning" | "error";
};

export type LifeArea = {
  id: string;
  name: string;
  description: string;
  icon: string;
  displayOrder: number;
  status: "active" | "paused" | "archived";
  privacyLevel: PrivacyLevel;
  updatedAt: string;
};

export type Goal = {
  id: string;
  lifeAreaId: string;
  title: string;
  description: string;
  motivation: string;
  successCriteria: string;
  status: "idea" | "planned" | "active" | "paused" | "completed" | "abandoned" | "archived";
  priority: Priority;
  startDate?: string;
  targetDate?: string;
  manualProgress: number;
  progressMode: "manual" | "tasks" | "habits";
  nextAction: string;
  abandonConditions?: string;
  privacyLevel: PrivacyLevel;
  updatedAt: string;
  archivedAt?: string;
};

export type Habit = {
  id: string;
  lifeAreaId?: string;
  goalId?: string;
  name: string;
  description: string;
  frequencyType: "daily" | "weekly" | "monthly" | "custom";
  recurrenceRule?: string;
  targetValue?: number;
  unit?: string;
  reminderTime?: string;
  status: "active" | "paused" | "archived";
  privacyLevel: PrivacyLevel;
  updatedAt: string;
};

export type HabitLog = {
  id: string;
  habitId: string;
  logDate: string;
  status: "completed" | "partial" | "skipped" | "missed";
  value?: number;
  note?: string;
  completedAt?: string;
};

export type Routine = {
  id: string;
  lifeAreaId?: string;
  name: string;
  description: string;
  scheduleType: "daily" | "weekly" | "monthly" | "custom";
  recurrenceRule?: string;
  status: "active" | "paused" | "archived";
  privacyLevel: PrivacyLevel;
  updatedAt: string;
};

export type RoutineStep = {
  id: string;
  routineId: string;
  title: string;
  displayOrder: number;
  estimatedMinutes?: number;
};

export type RoutineLog = {
  id: string;
  routineId: string;
  logDate: string;
  status: "completed" | "skipped" | "partial";
  completedStepIds: string[];
  note?: string;
};

export type DailyCheckin = {
  id: string;
  date: string;
  sleepAt?: string;
  wakeAt?: string;
  sleepHours?: number;
  sleepQuality?: number;
  energy?: number;
  mood?: number;
  stress?: number;
  exercise?: string;
  studyMinutes?: number;
  workMinutes?: number;
  note?: string;
  privacyLevel: PrivacyLevel;
  updatedAt: string;
};

export type DailyReview = {
  id: string;
  date: string;
  completed: string;
  problems: string;
  state: string;
  tomorrowFocus: string;
  privacyLevel: PrivacyLevel;
  updatedAt: string;
};

export type WeeklyReview = {
  id: string;
  weekStart: string;
  completedTaskIds: string[];
  unfinishedTaskIds: string[];
  projectChanges: string;
  goalProgress: string;
  habitCompletionRate: number;
  studyMinutes: number;
  sleepTrend: string;
  moodTrend: string;
  spendingSummaryPlaceholder: string;
  nextWeekFocus: string[];
  privacyLevel: PrivacyLevel;
  updatedAt: string;
};

export type AutomationRun = {
  id: string;
  name: string;
  status: "success" | "failed" | "not_configured";
  lastRun: string;
  nextRun: string;
};

export type MyOSData = {
  projects: Project[];
  projectMilestones: ProjectMilestone[];
  projectRisks: ProjectRisk[];
  tasks: Task[];
  inbox: InboxItem[];
  prompts: Prompt[];
  notes: Note[];
  files: FileRecord[];
  activities: Activity[];
  automations: AutomationRun[];
  lifeAreas: LifeArea[];
  goals: Goal[];
  habits: Habit[];
  habitLogs: HabitLog[];
  routines: Routine[];
  routineSteps: RoutineStep[];
  routineLogs: RoutineLog[];
  dailyCheckins: DailyCheckin[];
  dailyReviews: DailyReview[];
  weeklyReviews: WeeklyReview[];
  agentAssignments: AgentAssignment[];
  agentWorkItems: AgentWorkItem[];
  agentReports: AgentReport[];
  agentWorkEvents: AgentWorkEvent[];
};
