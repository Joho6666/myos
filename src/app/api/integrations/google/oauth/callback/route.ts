import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { updateRuntimeConfig } from "@/lib/config/env-config";
import { getGoogleRedirectUri, verifyGoogleOAuthState } from "@/server/integrations/google";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectToApp(request: Request, status: "connected" | "error", message: string) {
  const url = new URL("/app/integrations", request.url);
  url.searchParams.set("google", status);
  url.searchParams.set("message", message.slice(0, 180));
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return redirectToApp(request, "error", "Google 授权完成，但当前浏览器没有有效的 MyOS 登录会话。");
  const params = new URL(request.url).searchParams;
  const state = params.get("state") || "";
  const verified = verifyGoogleOAuthState(state);
  if (!verified || verified.email !== session.email.toLowerCase()) return redirectToApp(request, "error", "Google 授权状态已失效，请重新开始连接。");
  const error = params.get("error");
  if (error) return redirectToApp(request, "error", `Google 授权未完成：${error}`);
  const code = params.get("code");
  if (!code) return redirectToApp(request, "error", "Google 没有返回授权 code。");

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return redirectToApp(request, "error", "请先配置 Google Client ID 和 Client Secret。");

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: getGoogleRedirectUri(), grant_type: "authorization_code" })
    });
    const body = await tokenResponse.json().catch(() => null) as { refresh_token?: string; error_description?: string } | null;
    if (!tokenResponse.ok || !body?.refresh_token) throw new Error(body?.error_description || "Google 没有返回 refresh token。请重新授权并允许离线访问。");
    await updateRuntimeConfig({ GOOGLE_REFRESH_TOKEN: body.refresh_token });
    return redirectToApp(request, "connected", "Google 已连接，Calendar、Tasks、Drive 和 Gmail 可以开始读取。");
  } catch (callbackError) {
    return redirectToApp(request, "error", callbackError instanceof Error ? callbackError.message : "保存 Google 授权失败。");
  }
}
