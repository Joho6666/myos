import { timingSafeEqual } from "node:crypto";

const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 5;

const attempts = new Map<string, { count: number; resetAt: number }>();

export function consumeRateLimit(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= RATE_LIMIT;
}

export function getAccessCode() {
  return process.env.MYOS_ACCESS_CODE?.trim() || "";
}

export function isAccessCodeUsable(code: string) {
  return code.length >= 8;
}

export function accessCodeMatches(provided: string, expected: string) {
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function isLoopbackHost(host: string | null | undefined) {
  if (!host) return false;
  let hostname = host.trim().toLowerCase();
  if (hostname.startsWith("[")) {
    const end = hostname.indexOf("]");
    if (end === -1) return false;
    hostname = hostname.slice(1, end);
  } else {
    const colon = hostname.lastIndexOf(":");
    if (colon !== -1 && hostname.indexOf(":") === colon) hostname = hostname.slice(0, colon);
  }
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}
