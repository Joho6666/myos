import { afterEach, describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "./session-token";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("signed MyOS session tokens", () => {
  it("accepts a token signed with the configured session secret", async () => {
    process.env.MYOS_SESSION_SECRET = "test-only-secret";

    const token = await createSessionToken("Owner@Example.com");
    await expect(verifySessionToken(token)).resolves.toMatchObject({ email: "owner@example.com" });
  });

  it("rejects a forged legacy owner cookie", async () => {
    process.env.MYOS_SESSION_SECRET = "test-only-secret";

    await expect(verifySessionToken("owner")).resolves.toBeNull();
  });

  it("rejects a token signed with another secret", async () => {
    process.env.MYOS_SESSION_SECRET = "test-only-secret";
    const token = await createSessionToken("owner@example.com");

    process.env.MYOS_SESSION_SECRET = "different-secret";
    await expect(verifySessionToken(token)).resolves.toBeNull();
  });

  it("does not fall back to the Supabase service role key", async () => {
    delete process.env.MYOS_SESSION_SECRET;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

    await expect(createSessionToken("owner@example.com")).rejects.toThrow();
    await expect(verifySessionToken("a.b")).resolves.toBeNull();
  });
});
