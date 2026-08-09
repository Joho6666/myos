"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getOwnerEmail } from "@/lib/auth/session";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from "@/lib/auth/session-token";

const loginSchema = z.object({
  email: z.string().email()
});

export type LoginState = {
  error?: string;
};

export async function loginAction(_state: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email")
  });

  if (!parsed.success) {
    return { error: "请输入有效邮箱。" };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const ownerEmail = getOwnerEmail();

  if (email !== ownerEmail) {
    return { error: "该邮箱不是 MyOS 拥有者。" };
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
