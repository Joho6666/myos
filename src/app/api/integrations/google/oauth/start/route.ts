import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createGoogleOAuthState, getGoogleAuthUrl } from "@/server/integrations/google";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "需要先登录 MyOS。" }, { status: 401 });
  if (!process.env.GOOGLE_CLIENT_ID?.trim() || !process.env.GOOGLE_CLIENT_SECRET?.trim()) {
    return NextResponse.json({ error: "请先在设置中配置 GOOGLE_CLIENT_ID 和 GOOGLE_CLIENT_SECRET。" }, { status: 503 });
  }

  try {
    const state = createGoogleOAuthState(session.email);
    return NextResponse.redirect(getGoogleAuthUrl(state));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "无法开始 Google 授权。" }, { status: 503 });
  }
}
