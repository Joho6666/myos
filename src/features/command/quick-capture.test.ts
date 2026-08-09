import { describe, expect, it } from "vitest";
import { parseQuickCaptureIntent } from "./quick-capture";

describe("parseQuickCaptureIntent", () => {
  it("parses project quick capture", () => {
    const intent = parseQuickCaptureIntent("项目 MyOS 优化 / 完善命令中心");
    expect(intent?.kind).toBe("project");
    expect(intent?.payload).toMatchObject({
      name: "MyOS 优化",
      nextAction: "完善命令中心"
    });
  });

  it("parses task quick capture with due time and focus", () => {
    const intent = parseQuickCaptureIntent("任务 设计命令面板 20:30 重点");
    expect(intent?.kind).toBe("task");
    expect(intent?.payload).toMatchObject({
      title: "设计命令面板",
      due: "20:30",
      plannedDate: "today",
      todayFocus: true
    });
  });

  it("keeps tomorrow as the planned calendar day", () => {
    const intent = parseQuickCaptureIntent("任务 明天整理 Supabase 迁移");
    expect(intent?.kind).toBe("task");
    expect(intent?.payload).toMatchObject({
      title: "整理 Supabase 迁移",
      due: "明天",
      plannedDate: "tomorrow"
    });
  });

  it("parses inbox quick capture", () => {
    const intent = parseQuickCaptureIntent("想法 做一个 PCB 检查清单");
    expect(intent?.kind).toBe("inbox");
    expect(intent?.payload).toMatchObject({
      title: "做一个 PCB 检查清单",
      type: "idea",
      category: "快速记录"
    });
  });
});
