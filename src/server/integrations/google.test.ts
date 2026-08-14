import { describe, expect, it } from "vitest";
import { createGoogleOAuthState, getGoogleAuthUrl, googleCalendarDateRange, googleDateOnly, googleTaskDueDate, verifyGoogleOAuthState } from "./google";

describe("Google integration date helpers", () => {
  it("formats a timestamp in the MyOS timezone", () => {
    expect(googleDateOnly("2026-08-13T16:30:00.000Z")).toBe("2026-08-14");
  });

  it("converts a local date into Google's task due format", () => {
    expect(googleTaskDueDate("2026-08-14")).toBe("2026-08-14T00:00:00.000Z");
    expect(googleTaskDueDate("not-a-date")).toBeUndefined();
  });

  it("builds a seven day calendar window", () => {
    const range = googleCalendarDateRange(new Date("2026-08-13T08:30:00.000Z"));
    expect(new Date(range.end).getTime() - new Date(range.start).getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("signs and verifies the OAuth state without exposing the email in plain text", () => {
    const previous = process.env.MYOS_SESSION_SECRET;
    process.env.MYOS_SESSION_SECRET = "test-session-secret-for-google-oauth-state";
    const state = createGoogleOAuthState("owner@example.com", 1_000_000);
    expect(state).not.toContain("owner@example.com");
    expect(verifyGoogleOAuthState(state, 1_000_001)?.email).toBe("owner@example.com");
    expect(verifyGoogleOAuthState(`${state}tampered`, 1_000_001)).toBeNull();
    if (previous === undefined) delete process.env.MYOS_SESSION_SECRET;
    else process.env.MYOS_SESSION_SECRET = previous;
  });

  it("builds an OAuth URL without exposing a client secret", () => {
    const previousClientId = process.env.GOOGLE_CLIENT_ID;
    const previousRedirect = process.env.GOOGLE_REDIRECT_URI;
    process.env.GOOGLE_CLIENT_ID = "client-id";
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/api/integrations/google/oauth/callback";
    const url = new URL(getGoogleAuthUrl("signed-state"));
    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("client_id")).toBe("client-id");
    expect(url.searchParams.get("state")).toBe("signed-state");
    expect(url.searchParams.get("scope")).toContain("https://www.googleapis.com/auth/calendar");
    expect(url.searchParams.get("client_secret")).toBeNull();
    if (previousClientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = previousClientId;
    if (previousRedirect === undefined) delete process.env.GOOGLE_REDIRECT_URI;
    else process.env.GOOGLE_REDIRECT_URI = previousRedirect;
  });
});
