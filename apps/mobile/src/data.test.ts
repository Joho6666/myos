import { describe, expect, it } from "vitest";
import {
  createInitialState,
  markSyncFailure,
  normalizeState,
  queueAction,
  resolveConflict,
  retryDelayMs,
  todayTasks
} from "./data";

describe("mobile offline queue", () => {
  it("queues a task and keeps it in local data", () => {
    const created = queueAction(createInitialState(), {
      type: "task.upsert",
      item: { id: "t1", title: "离线任务", priority: "high", status: "planned", todayFocus: true, updatedAt: "now", revision: 1 }
    });
    expect(created.data.tasks).toHaveLength(1);
    expect(created.queue).toHaveLength(1);
    expect(created.queue[0]?.attempts).toBe(0);
  });

  it("increments attempts and schedules backoff", () => {
    const queued = queueAction(createInitialState(), {
      type: "inbox.upsert",
      item: { id: "i1", title: "想法", type: "idea", category: "收件箱", status: "pending", updatedAt: "now", revision: 1 }
    });
    const failed = markSyncFailure(queued, 1_000);
    expect(failed.queue[0]?.attempts).toBe(1);
    expect(failed.nextRetryAt).toBe(1_000 + retryDelayMs(1));
    expect(retryDelayMs(9)).toBe(5 * 60 * 1000);
  });

  it("keeps local data when resolving a conflict in favor of the phone", () => {
    const local = { type: "task.upsert" as const, item: { id: "t1", title: "手机版", priority: "medium" as const, status: "planned" as const, todayFocus: true, updatedAt: "now", revision: 2 } };
    const remote = { type: "task.upsert" as const, item: { ...local.item, title: "云端版", revision: 3 } };
    const state = {
      ...createInitialState(),
      data: { tasks: [remote.item], projects: [], inbox: [], updatedAt: "now" },
      conflicts: [{ id: "c1", operationId: "op", entity: "task" as const, entityId: "t1", local, remote, createdAt: "now" }]
    };
    const resolved = resolveConflict(state, "c1", "local");
    expect(resolved.data.tasks[0]?.title).toBe("手机版");
    expect(resolved.queue).toHaveLength(1);
    expect(resolved.conflicts).toHaveLength(0);
  });

  it("filters today tasks to unfinished focus items", () => {
    const state = normalizeState({
      data: {
        tasks: [
          { id: "a", title: "今日", priority: "high", status: "planned", todayFocus: true, updatedAt: "now", revision: 1 },
          { id: "b", title: "完成", priority: "low", status: "completed", todayFocus: true, updatedAt: "now", revision: 1 },
          { id: "c", title: "其他", priority: "low", status: "planned", todayFocus: false, updatedAt: "now", revision: 1 }
        ],
        projects: [],
        inbox: [],
        updatedAt: "now"
      }
    });
    expect(todayTasks(state).map((item) => item.id)).toEqual(["a"]);
  });
});
