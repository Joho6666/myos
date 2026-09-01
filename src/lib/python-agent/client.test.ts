import { afterEach, describe, expect, it, vi } from "vitest";
import { chooseAgent, getPythonAgentStatus } from "./client";

describe("getPythonAgentStatus", () => {
  afterEach(() => {
    delete process.env.MYOS_PYTHON_AGENT_TOKEN;
    delete process.env.PYTHON_AGENT_BASE_URL;
    vi.unstubAllGlobals();
  });

  it("reports a clear unconfigured state without making a network request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await getPythonAgentStatus();

    expect(result.configured).toBe(false);
    expect(result.connected).toBe(false);
    expect(result.message).toContain("未配置");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reads health and the protected runtime registry", async () => {
    process.env.MYOS_PYTHON_AGENT_TOKEN = "runtime-token";
    process.env.PYTHON_AGENT_BASE_URL = "http://127.0.0.1:43200";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, version: "0.1.0", myosConfigured: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ version: "0.1.0", agents: [{ id: "codex", label: "Codex", registered: true, available: false, executionMode: "manual", detail: "manual" }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getPythonAgentStatus();

    expect(result.connected).toBe(true);
    expect(result.myosConfigured).toBe(true);
    expect(result.agents[0]?.id).toBe("codex");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ headers: { authorization: "Bearer runtime-token", accept: "application/json" } });
  });

  it("routes auto selection to an available adapter", () => {
    const agents = [
      { id: "claude-code", label: "Claude Code", registered: true, available: false, executionMode: "manual" as const, detail: "unsupported" },
      { id: "codex", label: "Codex", registered: true, available: true, executionMode: "adapter" as const, detail: "ready" }
    ];
    expect(chooseAgent({ requested: "auto", preferred: "claude-code", fallback: "codex", agents }).agentId).toBe("codex");
    expect(chooseAgent({ requested: "codex", agents }).available).toBe(true);
    expect(chooseAgent({ requested: "hermes", agents: [] }).available).toBe(false);
  });
});
