import { describe, expect, it } from "vitest";
import { getNextTasks, getTodayTasks } from "./calculations";
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

  it("prioritizes actionable tasks and never repeats today's focus", () => {
    const result = getNextTasks([
      task({ id: "focus", todayFocus: true, priority: "high" }),
      task({ id: "later", plannedDate: "2099-12-31", priority: "high" }),
      task({ id: "today-low", plannedDate: "today", priority: "low" }),
      task({ id: "today-high", plannedDate: "today", priority: "high" }),
      task({ id: "done", done: true, priority: "high" })
    ]);

    expect(result.map((item) => item.id)).toEqual(["today-high", "today-low", "later"]);
  });
});
