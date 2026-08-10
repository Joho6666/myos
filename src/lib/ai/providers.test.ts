import { afterEach, describe, expect, it, vi } from "vitest";
import { getAIProviders } from "./providers";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("AI providers", () => {
  it("registers DeepSeek as an OpenAI-compatible provider", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "deepseek-test-key");

    const provider = getAIProviders().find((item) => item.id === "deepseek");

    expect(provider).toBeDefined();
    expect(await provider?.testConnection()).toEqual({ ok: true, message: "DeepSeek 已配置" });
    expect(await provider?.listModels()).toEqual([{ id: "deepseek-v4-flash", name: "deepseek-v4-flash" }]);
  });

  it("keeps DeepSeek visible as an unconfigured provider", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "");

    const provider = getAIProviders().find((item) => item.id === "deepseek");

    expect(await provider?.testConnection()).toEqual({ ok: false, message: "未配置 DEEPSEEK_API_KEY" });
  });
});
