import { createClient, type Session } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
export const supabase = url && key ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }) : null;

export async function currentSession(): Promise<Session | null> { return (await supabase?.auth.getSession())?.data.session || null; }
export async function requestMagicLink(email: string) {
  if (!supabase) throw new Error("未配置 Supabase Mobile 环境变量。");
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: "myos://auth/callback" } });
  if (error) throw error;
}
