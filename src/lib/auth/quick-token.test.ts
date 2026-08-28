import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { authenticateQuickRequest } from "./quick-token";

describe("authenticateQuickRequest", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("authenticates with Bearer token matching MYOS_QUICK_API_TOKEN", async () => {
    process.env.MYOS_QUICK_API_TOKEN = "secret-token-123";
    process.env.OWNER_EMAIL = "owner@test.com";

    const req = new Request("http://localhost:3000/api/quick-capture", {
      headers: { authorization: "Bearer secret-token-123" }
    });

    const session = await authenticateQuickRequest(req);
    expect(session).not.toBeNull();
    expect(session?.email).toBe("owner@test.com");
  });

  it("authenticates with x-api-key header", async () => {
    process.env.MYOS_QUICK_API_TOKEN = "secret-token-123";
    const req = new Request("http://localhost:3000/api/quick-capture", {
      headers: { "x-api-key": "secret-token-123" }
    });

    const session = await authenticateQuickRequest(req);
    expect(session).not.toBeNull();
  });

  it("authenticates with query parameter token", async () => {
    process.env.MYOS_QUICK_API_TOKEN = "secret-token-123";
    const req = new Request("http://localhost:3000/api/widget/summary?token=secret-token-123");

    const session = await authenticateQuickRequest(req);
    expect(session).not.toBeNull();
  });

  it("rejects invalid token", async () => {
    process.env.MYOS_QUICK_API_TOKEN = "secret-token-123";
    const req = new Request("http://localhost:3000/api/quick-capture", {
      headers: { authorization: "Bearer wrong-token" }
    });

    const session = await authenticateQuickRequest(req);
    expect(session).toBeNull();
  });
});
