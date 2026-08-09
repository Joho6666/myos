import { describe, expect, it } from "vitest";
import { getTodayTasks } from "./calculations";
import type { Task } from "@/lib/data/models";

const task = (overrides: Partial<Task>): Task => ({
  id: "task",
  title: "测试任务",
  priority: "medium",
  due: "10:00",
  plannedDate: "today",
  status: "planned",
  todayFocus: false,
  done: false,
  ...overrides
});

describe("life calculations", () => {
  it("does not show a task planned for tomorrow in today's list", () => {
    const today = new Intl.DateTimeFormat("en-CA").format(new Date());
    const tomorrow = new Date(`${today}T12:00:00`);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = new Intl.DateTimeFormat("en-CA").format(tomorrow);

    expect(getTodayTasks([task({ plannedDate: tomorrowKey })])).toHaveLength(0);
    expect(getTodayTasks([task({ plannedDate: "today" })])).toHaveLength(1);
  });
});
