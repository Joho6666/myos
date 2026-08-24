import { createHmac, timingSafeEqual } from "node:crypto";

export type GoogleTokenResponse = {
  access_token?: string;
  error_description?: string;
};

export const GOOGLE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/tasks",
  "https://www.googleapis.com/auth/drive.readonly"
];

function oauthStateSecret() {
  return process.env.MYOS_SESSION_SECRET?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
}

function encodeState(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeState(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function createGoogleOAuthState(email: string, now = Date.now()) {
  const secret = oauthStateSecret();
  if (!secret) throw new Error("未配置 MYOS_SESSION_SECRET，无法开始 Google 授权。");
  const payload = encodeState(JSON.stringify({ email: email.trim().toLowerCase(), exp: now + 10 * 60 * 1000 }));
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyGoogleOAuthState(state: string, now = Date.now()) {
  const secret = oauthStateSecret();
  if (!secret) return null;
  const [payload, signature] = state.split(".");
  if (!payload || !signature) return null;
  try {
    const expected = createHmac("sha256", secret).update(payload).digest("base64url");
    const left = Buffer.from(signature);
    const right = Buffer.from(expected);
    if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
    const parsed = JSON.parse(decodeState(payload)) as { email?: string; exp?: number };
    if (!parsed.email || !parsed.exp || parsed.exp < now) return null;
    return { email: parsed.email, exp: parsed.exp };
  } catch {
    return null;
  }
}

export function getGoogleRedirectUri() {
  return process.env.GOOGLE_REDIRECT_URI?.trim() || `${(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "")}/api/integrations/google/oauth/callback`;
}

export function getGoogleAuthUrl(state: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) throw new Error("未配置 GOOGLE_CLIENT_ID，无法开始 Google 授权。");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getGoogleRedirectUri(),
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_OAUTH_SCOPES.join(" "),
    state
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export const isGoogleConfigured = hasGoogleOAuthConfig;
export function hasGoogleOAuthConfig() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim() &&
      process.env.GOOGLE_REFRESH_TOKEN?.trim()
  );
}

export async function refreshGoogleToken(signal: AbortSignal) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN?.trim();

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("未配置 Google OAuth 凭据。");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    }),
    signal
  });
  const body = (await response.json().catch(() => null)) as GoogleTokenResponse | null;
  if (!response.ok || !body?.access_token) {
    throw new Error(body?.error_description || "Google token 刷新失败。");
  }
  return body.access_token;
}

export async function googleFetch<T>(url: string, accessToken: string, signal: AbortSignal, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${accessToken}`);
  const response = await fetch(url, { ...init, headers, signal });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof body?.error?.message === "string"
      ? body.error.message
      : typeof body?.error_description === "string"
        ? body.error_description
        : `Google API 返回 ${response.status}`;
    throw new Error(message);
  }
  return body as T;
}

export function googleDateOnly(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat("en-CA", { timeZone: process.env.MYOS_TIME_ZONE || "Asia/Shanghai" }).format(date);
}

export function googleTaskDueDate(value?: string) {
  const dateOnly = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : googleDateOnly(value);
  return dateOnly ? `${dateOnly}T00:00:00.000Z` : undefined;
}

export function googleCalendarDateRange(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start: start.toISOString(), end: end.toISOString() };
}
