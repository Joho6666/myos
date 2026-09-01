export type Priority = "high" | "medium" | "low";
export type TaskStatus = "planned" | "in_progress" | "completed";

export type MobileTask = { id: string; title: string; priority: Priority; due?: string; projectId?: string; status: TaskStatus; todayFocus: boolean; updatedAt: string; revision: number };
export type MobileProject = { id: string; name: string; category: string; nextAction: string; status: "planned" | "active" | "done"; updatedAt: string; revision: number };
export type MobileInbox = { id: string; title: string; type: "idea" | "text" | "link" | "file"; category: string; status: "pending" | "classified" | "archived"; updatedAt: string; revision: number };
export type MobileExecution = {
  id: string;
  title: string;
  projectName: string;
  agentId: string;
  status: string;
  phase: string;
  updatedAt: string;
  error?: string;
};
export type MobileData = { tasks: MobileTask[]; projects: MobileProject[]; inbox: MobileInbox[]; updatedAt: string };
export type CoreEntity = "task" | "project" | "inbox";
export type CoreAction =
  | { type: "task.upsert"; item: MobileTask }
  | { type: "task.delete"; id: string }
  | { type: "project.upsert"; item: MobileProject }
  | { type: "project.delete"; id: string }
  | { type: "inbox.upsert"; item: MobileInbox }
  | { type: "inbox.delete"; id: string };

export type QueuedOperation = { id: string; deviceId: string; action: CoreAction; entity: CoreEntity; entityId: string; baseRevision: number; createdAt: string; attempts: number };
export type SyncConflict = { id: string; operationId: string; entity: CoreEntity; entityId: string; local: CoreAction; remote: CoreAction | null; createdAt: string };
export type LocalState = {
  data: MobileData;
  queue: QueuedOperation[];
  conflicts: SyncConflict[];
  cursor: string | null;
  deviceId: string;
  executions: MobileExecution[];
  lastSyncAt: string | null;
  nextRetryAt: number | null;
};

const MAX_RETRY_MS = 5 * 60 * 1000;

export const emptyData = (): MobileData => ({ tasks: [], projects: [], inbox: [], updatedAt: new Date().toISOString() });
export const createInitialState = (): LocalState => ({
  data: emptyData(),
  queue: [],
  conflicts: [],
  cursor: null,
  deviceId: crypto.randomUUID(),
  executions: [],
  lastSyncAt: null,
  nextRetryAt: null
});

export function normalizeState(input: Partial<LocalState> | null | undefined): LocalState {
  const base = createInitialState();
  if (!input) return base;
  return {
    ...base,
    ...input,
    data: {
      tasks: input.data?.tasks ?? [],
      projects: input.data?.projects ?? [],
      inbox: input.data?.inbox ?? [],
      updatedAt: input.data?.updatedAt ?? base.data.updatedAt
    },
    queue: input.queue ?? [],
    conflicts: input.conflicts ?? [],
    executions: input.executions ?? [],
    deviceId: input.deviceId || base.deviceId
  };
}

function upsert<T extends { id: string }>(items: T[], item: T) { return [item, ...items.filter((entry) => entry.id !== item.id)]; }

export function applyAction(data: MobileData, action: CoreAction): MobileData {
  const now = new Date().toISOString();
  switch (action.type) {
    case "task.upsert": return { ...data, tasks: upsert(data.tasks, action.item), updatedAt: now };
    case "task.delete": return { ...data, tasks: data.tasks.filter((item) => item.id !== action.id), updatedAt: now };
    case "project.upsert": return { ...data, projects: upsert(data.projects, action.item), updatedAt: now };
    case "project.delete": return { ...data, projects: data.projects.filter((item) => item.id !== action.id), updatedAt: now };
    case "inbox.upsert": return { ...data, inbox: upsert(data.inbox, action.item), updatedAt: now };
    case "inbox.delete": return { ...data, inbox: data.inbox.filter((item) => item.id !== action.id), updatedAt: now };
  }
}

export function actionTarget(action: CoreAction): { entity: CoreEntity; id: string; revision: number } {
  switch (action.type) {
    case "task.upsert": return { entity: "task", id: action.item.id, revision: action.item.revision };
    case "task.delete": return { entity: "task", id: action.id, revision: 0 };
    case "project.upsert": return { entity: "project", id: action.item.id, revision: action.item.revision };
    case "project.delete": return { entity: "project", id: action.id, revision: 0 };
    case "inbox.upsert": return { entity: "inbox", id: action.item.id, revision: action.item.revision };
    case "inbox.delete": return { entity: "inbox", id: action.id, revision: 0 };
  }
}

export function queueAction(state: LocalState, action: CoreAction): LocalState {
  const target = actionTarget(action);
  const operation: QueuedOperation = { id: crypto.randomUUID(), deviceId: state.deviceId, action, entity: target.entity, entityId: target.id, baseRevision: Math.max(0, target.revision - 1), createdAt: new Date().toISOString(), attempts: 0 };
  return { ...state, data: applyAction(state.data, action), queue: [...state.queue, operation], nextRetryAt: null };
}

export function resolveConflict(state: LocalState, conflictId: string, choice: "local" | "remote"): LocalState {
  const conflict = state.conflicts.find((item) => item.id === conflictId);
  if (!conflict) return state;
  const action = choice === "local" ? conflict.local : conflict.remote;
  const data = action ? applyAction(state.data, action) : state.data;
  const queue = choice === "local" ? [...state.queue, { id: crypto.randomUUID(), deviceId: state.deviceId, action: conflict.local, entity: conflict.entity, entityId: conflict.entityId, baseRevision: 0, createdAt: new Date().toISOString(), attempts: 0 }] : state.queue;
  return { ...state, data, queue, conflicts: state.conflicts.filter((item) => item.id !== conflictId) };
}

export function retryDelayMs(attempts: number) {
  const delay = Math.min(MAX_RETRY_MS, 2000 * (2 ** Math.max(0, attempts - 1)));
  return delay;
}

export function markSyncFailure(state: LocalState, now = Date.now()): LocalState {
  const attempts = Math.max(...state.queue.map((item) => item.attempts), 0) + 1;
  return {
    ...state,
    queue: state.queue.map((item) => ({ ...item, attempts: item.attempts + 1 })),
    nextRetryAt: now + retryDelayMs(attempts)
  };
}

export function markSyncSuccess(state: LocalState, extras: Partial<LocalState> = {}): LocalState {
  return {
    ...state,
    ...extras,
    lastSyncAt: new Date().toISOString(),
    nextRetryAt: null
  };
}

export function todayTasks(state: LocalState) {
  return state.data.tasks.filter((item) => item.todayFocus && item.status !== "completed");
}
