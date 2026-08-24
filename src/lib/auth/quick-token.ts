import { getOwnerEmail } from "./config";
import { getSession, type MyOSSession } from "./session";

export async function authenticateQuickRequest(request: Request): Promise<MyOSSession | null> {
  const configuredToken = process.env.MYOS_QUICK_API_TOKEN?.trim() || process.env.MYOS_API_TOKEN?.trim();

  const authHeader = request.headers.get("authorization");
  const apiKey = request.headers.get("x-api-key")?.trim();
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token")?.trim();

  const hasExplicitToken = Boolean(authHeader || apiKey || queryToken);

  if (configuredToken && hasExplicitToken) {
    if (authHeader) {
      const [scheme, token] = authHeader.split(" ");
      if (scheme?.toLowerCase() === "bearer" && token?.trim() === configuredToken) {
        return {
          email: getOwnerEmail(),
          mode: process.env.OWNER_EMAIL ? "configured-owner" : "local-demo"
        };
      }
    }

    if (apiKey && apiKey === configuredToken) {
      return {
        email: getOwnerEmail(),
        mode: process.env.OWNER_EMAIL ? "configured-owner" : "local-demo"
      };
    }

    if (queryToken && queryToken === configuredToken) {
      return {
        email: getOwnerEmail(),
        mode: process.env.OWNER_EMAIL ? "configured-owner" : "local-demo"
      };
    }

    // 显式传入了 Token 但校验未通过，直接拒绝
    return null;
  }

  // 仅在未显式传递 Token 时（如 Web 页面自身交互），才尝试回退到 Web 会话 Cookie
  if (!hasExplicitToken) {
    try {
      const session = await getSession();
      if (session) {
        return session;
      }
    } catch {
      // cookies() may throw outside Next request context (e.g. vitest)
    }
  }

  return null;
}
