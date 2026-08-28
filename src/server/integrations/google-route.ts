import { refreshGoogleToken } from "./google";

export async function withGoogleAccessToken<T>(task: (accessToken: string, signal: AbortSignal) => Promise<T>, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const accessToken = await refreshGoogleToken(controller.signal);
    return await task(accessToken, controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

export function googleErrorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  return { error: message, status: message.includes("未配置") ? 503 : 502 };
}
