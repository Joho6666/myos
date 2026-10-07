"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getOwnerEmail } from "@/lib/auth/session";
import {
  accessCodeMatches,
  consumeRateLimit,
  getAccessCode,
  isAccessCodeUsable,
  isLoopbackHost
} from "@/lib/auth/access-code";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from "@/lib/auth/session-token";

const loginSchema = z.object({
  email: z.string().email(),
  accessCode: z.string().optional()
});

export type LoginState = {
  error?: string;
};

export async function loginAction(_state: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    accessCode: formData.get("accessCode") ?? undefined
  });

  if (!parsed.success) {
    return { error: "请输入有效邮箱。" };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const ownerEmail = getOwnerEmail();

  if (email !== ownerEmail) {
    return { error: "该邮箱不是 MyOS 拥有者。" };
  }

  const headerList = await headers();
  const clientKey =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || headerList.get("host") || "unknown";
  if (!consumeRateLimit(`login:${clientKey}:${email}`)) {
    return { error: "尝试过于频繁，请一分钟后再试。" };
  }

  const accessCode = getAccessCode();
  const providedCode = parsed.data.accessCode?.trim() || "";
  if (accessCode) {
    if (!isAccessCodeUsable(accessCode)) {
      return { error: "MYOS_ACCESS_CODE 至少需要 8 个字符，请修正配置后重试。" };
    }
    if (!providedCode || !accessCodeMatches(providedCode, accessCode)) {
      return { error: "访问口令不正确。" };
    }
  } else if (!isLoopbackHost(headerList.get("host"))) {
    return { error: "未配置 MYOS_ACCESS_CODE，只允许本机登录；远程访问请先在服务端配置访问口令。" };
  }

  let sessionToken: string;
  try {
    sessionToken = await createSessionToken(email);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "无法建立安全登录会话。" };
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE
  });
  cookieStore.delete("myos_owner_email");

  redirect("/app");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete("myos_owner_email");
  redirect("/login");
}
