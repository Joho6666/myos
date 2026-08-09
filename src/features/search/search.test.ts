import { describe, expect, it } from "vitest";
import { seedData } from "@/lib/data/seed";
import { searchMyOS } from "./search";

describe("searchMyOS", () => {
  it("returns matching project results", () => {
    const results = searchMyOS(seedData, "循迹");
    expect(results.some((result) => result.title === "循迹小车优化")).toBe(true);
  });

  it("includes registered tools", () => {
    const results = searchMyOS(seedData, "JSON");
    expect(results.some((result) => result.title === "JSON 格式化")).toBe(true);
  });

  it("returns life-management results", () => {
    const goalResults = searchMyOS(seedData, "MyOS");
    expect(goalResults.some((result) => result.type === "目标")).toBe(true);

    const habitResults = searchMyOS(seedData, "晚间复盘");
    expect(habitResults.some((result) => result.type === "习惯")).toBe(true);
  });

  it("includes task, inbox, automation, and system results", () => {
    const taskResults = searchMyOS(seedData, "补全文档结构");
    expect(taskResults.some((result) => result.type === "任务")).toBe(true);

    const inboxResults = searchMyOS(seedData, "GitHub");
    expect(inboxResults.some((result) => result.type === "收件箱")).toBe(true);

    const automationResults = searchMyOS(seedData, "项目周报");
    expect(automationResults.some((result) => result.type === "自动化")).toBe(true);

    const storageResults = searchMyOS(seedData, "文件存储状态");
    expect(storageResults.some((result) => result.title === "文件存储状态")).toBe(true);
  });
});
