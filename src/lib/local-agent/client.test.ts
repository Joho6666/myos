import { afterEach, describe, expect, it, vi } from "vitest";
import { getLocalAgentStatus } from "./client";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe("getLocalAgentStatus", () => {
  it("returns an unconfigured state when local agent env is missing", async () => {
    delete process.env.LOCAL_AGENT_BASE_URL;
    delete process.env.LOCAL_AGENT_TOKEN;

    await expect(getLocalAgentStatus()).resolves.toMatchObject({
      configured: false,
      connected: false,
      message: "本地助手未配置。"
    });
  });

  it("collects health, ollama, and project status from the local agent", async () => {
    process.env.LOCAL_AGENT_BASE_URL = "http://127.0.0.1:43110";
    process.env.LOCAL_AGENT_TOKEN = "local-token";
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(init?.headers).toMatchObject({ authorization: "Bearer local-token" });
      if (url.endsWith("/health")) {
        return Response.json({ ok: true, name: "MyOS Local Agent", version: "0.1.0" });
      }
      if (url.endsWith("/ollama/status")) {
        return Response.json({ ok: true, message: "Ollama 可用", models: 2 });
      }
      if (url.endsWith("/projects")) {
        return Response.json({ projects: [{ id: "myos", name: "MyOS", path: "C:/myos", vscode: true }] });
      }
      return Response.json({ error: "not found" }, { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getLocalAgentStatus()).resolves.toMatchObject({
      configured: true,
      connected: true,
      health: { ok: true },
      ollama: { ok: true, models: 2 },
      projects: [{ id: "myos", name: "MyOS" }]
    });
  });

  it("returns a clear offline state when the local agent cannot be reached", async () => {
    process.env.LOCAL_AGENT_BASE_URL = "http://127.0.0.1:43110";
    process.env.LOCAL_AGENT_TOKEN = "local-token";
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("fetch failed");
    }));

    await expect(getLocalAgentStatus()).resolves.toMatchObject({
      configured: true,
      connected: false,
      message: "本地助手连接失败：fetch failed"
    });
  });
});
