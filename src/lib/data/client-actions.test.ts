import { afterEach, describe, expect, it, vi } from "vitest";
import { postMyOSAction } from "./client-actions";

describe("postMyOSAction", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns MyOS data when the backend accepts an action", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ projects: [{ id: "project-1", name: "MyOS" }] })
    }));

    const data = await postMyOSAction({
      type: "addProject",
      payload: { name: "MyOS", category: "AI开发", nextAction: "继续完善" }
    });

    expect(data.projects[0]?.name).toBe("MyOS");
  });

  it("throws the backend error instead of letting callers report success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "写入失败" })
    }));

    await expect(postMyOSAction({
      type: "addInbox",
      payload: { title: "测试", type: "text", category: "Gmail" }
    })).rejects.toThrow("写入失败");
  });
});
