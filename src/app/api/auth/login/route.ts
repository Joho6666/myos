import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getOwnerEmail } from "@/lib/auth/session";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from "@/lib/auth/session-token";

const loginSchema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "请输入有效邮箱。" }, { status: 400 });

  const email = parsed.data.email.trim().toLowerCase();
  if (email !== getOwnerEmail()) return NextResponse.json({ error: "该邮箱不是 MyOS 拥有者。" }, { status: 403 });

  try {
    const token = await createSessionToken(email);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE
    });
    cookieStore.delete("myos_owner_email");
    return NextResponse.json({ redirect: "/app" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "无法建立安全登录会话。" }, { status: 500 });
  }
}
