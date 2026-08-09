import { describe, expect, it } from "vitest";
import { ConfigValidationError, validateRuntimeConfigUpdates } from "./env-config";

describe("validateRuntimeConfigUpdates", () => {
  it("accepts valid runtime configuration values", () => {
    expect(() => validateRuntimeConfigUpdates({
      OWNER_EMAIL: "owner@example.com",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      OLLAMA_BASE_URL: "http://localhost:11434",
      N8N_BASE_URL: "https://n8n.example.com",
      LOCAL_AGENT_BASE_URL: "http://127.0.0.1:43110",
      N8N_REQUEST_TIMEOUT_MS: "30000",
      SUPABASE_STORAGE_BUCKET: "myos-files",
      SUPABASE_OWNER_USER_ID: "00000000-0000-4000-8000-000000000001"
    })).not.toThrow();
  });

  it("rejects invalid URLs before they are written to .env.local", () => {
    expect(() => validateRuntimeConfigUpdates({
      N8N_BASE_URL: "not-a-url"
    })).toThrow(ConfigValidationError);

    expect(() => validateRuntimeConfigUpdates({
      LOCAL_AGENT_BASE_URL: "not-a-url"
    })).toThrow(ConfigValidationError);
  });

  it("rejects invalid timeout and bucket values", () => {
    expect(() => validateRuntimeConfigUpdates({
      N8N_REQUEST_TIMEOUT_MS: "abc"
    })).toThrow("n8n Timeout 必须是 1000 到 300000 之间的整数毫秒数。");

    expect(() => validateRuntimeConfigUpdates({
      SUPABASE_STORAGE_BUCKET: "Bad Bucket"
    })).toThrow("Supabase Storage Bucket");
  });
});
