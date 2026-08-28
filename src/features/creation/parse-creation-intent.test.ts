import { describe, expect, it } from "vitest";
import type { Project } from "@/lib/data/models";
import { parseCreationIntent } from "./parse-creation-intent";

const projects: Project[] = [{ id: "project-1", name: "小智 Claw", category: "AI", status: "active", path: "", nextAction: "", updatedAt: "", favorite: false }];
const now = new Date("2026-08-28T04:00:00.000Z");

describe("parseCreationIntent", () => {
  it("识别中文任务、日期、时间和优先级", () => {
    const intent = parseCreationIntent("明天下午3点完成 STM32 串口测试，重要", projects, undefined, "Asia/Shanghai", now);
    expect(intent?.type).toBe("task");
    expect(intent?.title).toContain("完成 STM32 串口测试");
    expect(intent?.plannedDate).toBe("2026-08-29");
    expect(intent?.reminderTime).toBe("15:00");
    expect(intent?.priority).toBe("high");
  });

  it("识别项目和想法", () => {
    expect(parseCreationIntent("创建一个校园 AI 接单平台项目", projects, undefined, "Asia/Shanghai", now)?.type).toBe("project");
    expect(parseCreationIntent("记一下：可以研究大学生相机租赁", projects, undefined, "Asia/Shanghai", now)?.type).toBe("inbox");
  });

  it("项目详情上下文优先于文本匹配", () => {
    const intent = parseCreationIntent("测试 Agent Bridge", projects, { pathname: "/app/projects/project-1", project: { id: "project-1", name: "小智 Claw" } }, "Asia/Shanghai", now);
    expect(intent?.projectName).toBe("小智 Claw");
  });

  it("空输入不会生成意图，模糊输入要求确认", () => {
    expect(parseCreationIntent("", projects, undefined, "Asia/Shanghai", now)).toBeNull();
    expect(parseCreationIntent("继续处理这个", projects, undefined, "Asia/Shanghai", now)?.confidence).toBe("low");
  });

  it("不会把浏览项目或不重要任务误判为高优先级创建", () => {
    expect(parseCreationIntent("查看项目进度", projects, undefined, "Asia/Shanghai", now)?.type).toBeNull();
    const intent = parseCreationIntent("明天整理不重要的收据", projects, undefined, "Asia/Shanghai", now);
    expect(intent?.type).toBe("task");
    expect(intent?.priority).toBe("low");
    expect(intent?.title).toContain("不重要");
  });
});
