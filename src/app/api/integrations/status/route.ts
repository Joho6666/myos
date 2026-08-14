import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasGoogleOAuthConfig, refreshGoogleToken } from "@/server/integrations/google";
import { listGoogleCalendarEvents, listGoogleDriveFiles, listGoogleTaskLists } from "@/server/integrations/google-platforms";
import { recordIntegrationSync } from "@/server/integrations/sync-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IntegrationState = "connected" | "unconfigured" | "error";

type IntegrationStatus = {
  id: string;
  name: string;
  category: string;
  state: IntegrationState;
  message: string;
  detail?: string;
};

async function withTimeout<T>(task: (signal: AbortSignal) => Promise<T>, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await task(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

async function githubStatus(): Promise<IntegrationStatus> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return { id: "github", name: "GitHub", category: "代码与项目", state: "unconfigured", message: "等待配置 GITHUB_TOKEN", detail: "用于读取仓库、Issue、PR 和提交动态。" };
  }

  try {
    const data = await withTimeout(async (signal) => {
      const response = await fetch("https://api.github.com/user", {
        headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json" },
        signal
      });
      if (!response.ok) throw new Error(`GitHub 返回 ${response.status}`);
      return await response.json();
    });
    return { id: "github", name: "GitHub", category: "代码与项目", state: "connected", message: `已连接 ${data.login || "GitHub"}`, detail: "后续可同步仓库、Issue、PR、Star 和提交动态。" };
  } catch (error) {
    return { id: "github", name: "GitHub", category: "代码与项目", state: "error", message: error instanceof Error ? error.message : "GitHub 检测失败" };
  }
}

async function notionStatus(): Promise<IntegrationStatus> {
  const token = process.env.NOTION_TOKEN;
  if (!token) {
    return { id: "notion", name: "Notion", category: "知识与文档", state: "unconfigured", message: "等待配置 NOTION_TOKEN", detail: "用于读取数据库、页面和知识库条目。" };
  }

  try {
    const data = await withTimeout(async (signal) => {
      const response = await fetch("https://api.notion.com/v1/users/me", {
        headers: { authorization: `Bearer ${token}`, "notion-version": "2022-06-28" },
        signal
      });
      if (!response.ok) throw new Error(`Notion 返回 ${response.status}`);
      return await response.json();
    });
    return { id: "notion", name: "Notion", category: "知识与文档", state: "connected", message: `已连接 ${data.name || "Notion"}`, detail: "后续可同步页面、数据库和项目资料。" };
  } catch (error) {
    return { id: "notion", name: "Notion", category: "知识与文档", state: "error", message: error instanceof Error ? error.message : "Notion 检测失败" };
  }
}

async function gmailStatus(): Promise<IntegrationStatus> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    return { id: "gmail", name: "Gmail", category: "邮件与沟通", state: "unconfigured", message: "等待配置 Google OAuth 凭据", detail: "需要 GOOGLE_CLIENT_ID、GOOGLE_CLIENT_SECRET、GOOGLE_REFRESH_TOKEN。" };
  }

  try {
    const profile = await withTimeout(async (signal) => {
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
        signal
      });
      const tokenBody = await tokenResponse.json().catch(() => null);
      if (!tokenResponse.ok || !tokenBody?.access_token) throw new Error("Google token 刷新失败");

      const profileResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
        headers: { authorization: `Bearer ${tokenBody.access_token}` },
        signal
      });
      if (!profileResponse.ok) throw new Error(`Gmail 返回 ${profileResponse.status}`);
      return await profileResponse.json();
    });
    return { id: "gmail", name: "Gmail", category: "邮件与沟通", state: "connected", message: `已连接 ${profile.emailAddress || "Gmail"}`, detail: `邮件总数约 ${profile.messagesTotal ?? "未知"}。后续可同步邮件附件和待办。` };
  } catch (error) {
    return { id: "gmail", name: "Gmail", category: "邮件与沟通", state: "error", message: error instanceof Error ? error.message : "Gmail 检测失败" };
  }
}

async function googleCalendarStatus(): Promise<IntegrationStatus> {
  if (!hasGoogleOAuthConfig()) {
    return { id: "google-calendar", name: "Google Calendar", category: "日程", state: "unconfigured", message: "等待配置 Google OAuth 凭据", detail: "需要 Calendar 访问范围，读取手机端日程并接收 MyOS 任务。" };
  }

  try {
    const events = await withTimeout(async (signal) => {
      const token = await refreshGoogleToken(signal);
      return await listGoogleCalendarEvents(token, signal);
    });
    return { id: "google-calendar", name: "Google Calendar", category: "日程", state: "connected", message: "日历可访问", detail: `未来 7 天读取到 ${events.items?.length || 0} 个日程，可从 MyOS 写入任务。` };
  } catch (error) {
    return { id: "google-calendar", name: "Google Calendar", category: "日程", state: "error", message: error instanceof Error ? error.message : "Google Calendar 检测失败", detail: "如果 Gmail 已连接但这里异常，通常是 refresh token 没有 Calendar scope。" };
  }
}

async function googleTasksStatus(): Promise<IntegrationStatus> {
  if (!hasGoogleOAuthConfig()) {
    return { id: "google-tasks", name: "Google Tasks", category: "任务", state: "unconfigured", message: "等待配置 Google OAuth 凭据", detail: "需要 Tasks 访问范围，让 MyOS 任务和手机端 Google Tasks 联动。" };
  }

  try {
    const lists = await withTimeout(async (signal) => {
      const token = await refreshGoogleToken(signal);
      return await listGoogleTaskLists(token, signal);
    });
    return { id: "google-tasks", name: "Google Tasks", category: "任务", state: "connected", message: "任务清单可访问", detail: `发现 ${lists.items?.length || 0} 个任务清单，可导入并回写 MyOS 任务。` };
  } catch (error) {
    return { id: "google-tasks", name: "Google Tasks", category: "任务", state: "error", message: error instanceof Error ? error.message : "Google Tasks 检测失败", detail: "如果 Gmail 已连接但这里异常，通常是 refresh token 没有 Tasks scope。" };
  }
}

async function googleDriveStatus(): Promise<IntegrationStatus> {
  if (!hasGoogleOAuthConfig()) {
    return { id: "google-drive", name: "Google Drive", category: "文件", state: "unconfigured", message: "等待配置 Google OAuth 凭据", detail: "需要 Drive 只读访问范围，把云端文件链接带入 MyOS 文件中心。" };
  }

  try {
    const files = await withTimeout(async (signal) => {
      const token = await refreshGoogleToken(signal);
      return await listGoogleDriveFiles(token, signal);
    });
    return { id: "google-drive", name: "Google Drive", category: "文件", state: "connected", message: "云端文件可访问", detail: `最近读取到 ${files.files?.length || 0} 个文件元数据。` };
  } catch (error) {
    return { id: "google-drive", name: "Google Drive", category: "文件", state: "error", message: error instanceof Error ? error.message : "Google Drive 检测失败", detail: "如果 Gmail 已连接但这里异常，通常是 refresh token 没有 Drive scope。" };
  }
}

async function supabaseStatus(): Promise<IntegrationStatus> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) {
    return { id: "supabase", name: "Supabase", category: "数据库", state: "unconfigured", message: "等待配置 Supabase 环境变量", detail: "承载 MyOS 的项目、任务、文件、笔记和活动数据。" };
  }

  try {
    const response = await withTimeout((signal) => fetch(`${url.replace(/\/$/, "")}/rest/v1/profiles?select=id&limit=1`, {
      headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}` },
      signal
    }));
    if (!response.ok) {
      return { id: "supabase", name: "Supabase", category: "数据库", state: "error", message: `数据库接口返回 ${response.status}`, detail: "环境变量存在，但数据库健康检查未通过。请确认 Supabase 服务和迁移已启动。" };
    }
    return { id: "supabase", name: "Supabase", category: "数据库", state: "connected", message: "数据库可访问", detail: "项目、任务、文件、笔记和活动数据将保存到 Supabase。" };
  } catch {
    return { id: "supabase", name: "Supabase", category: "数据库", state: "error", message: "数据库无法访问", detail: "请确认本地 Supabase 正在运行，并检查 NEXT_PUBLIC_SUPABASE_URL。" };
  }
}

async function n8nStatus(): Promise<IntegrationStatus> {
  const baseUrl = process.env.N8N_BASE_URL?.trim();
  const secret = process.env.N8N_WEBHOOK_SECRET?.trim();
  if (!baseUrl || !secret) {
    return { id: "n8n", name: "n8n", category: "自动化", state: "unconfigured", message: "等待配置 N8N_BASE_URL 和 N8N_WEBHOOK_SECRET", detail: "用于运行每日资讯、文档分析、项目周报等流程。" };
  }

  try {
    const healthUrl = `${baseUrl.replace(/\/$/, "")}/healthz`;
    const response = await withTimeout((signal) => fetch(healthUrl, { signal }));
    if (!response.ok) throw new Error(`n8n 返回 ${response.status}`);
    return { id: "n8n", name: "n8n", category: "自动化", state: "connected", message: "n8n 服务可访问", detail: "服务端 Webhook 已配置，自动化可以从 MyOS 发起。" };
  } catch {
    return { id: "n8n", name: "n8n", category: "自动化", state: "error", message: "n8n 无法访问", detail: "请检查 N8N_BASE_URL、服务状态和网络连接。" };
  }
}

async function aiStatus(): Promise<IntegrationStatus> {
  const checks: Array<{ name: string; run: (signal: AbortSignal) => Promise<Response> }> = [];
  if (process.env.OPENAI_API_KEY?.trim()) {
    checks.push({ name: "OpenAI", run: (signal) => fetch("https://api.openai.com/v1/models", { headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, signal }) });
  }
  if (process.env.OPENROUTER_API_KEY?.trim()) {
    checks.push({ name: "OpenRouter", run: (signal) => fetch("https://openrouter.ai/api/v1/models", { headers: { authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` }, signal }) });
  }
  if (process.env.DEEPSEEK_API_KEY?.trim()) {
    checks.push({ name: "DeepSeek", run: (signal) => fetch("https://api.deepseek.com/models", { headers: { authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` }, signal }) });
  }
  const ollamaUrl = process.env.OLLAMA_BASE_URL?.trim();
  if (ollamaUrl) {
    const normalizedOllamaUrl = ollamaUrl.replace(/\/$/, "");
    checks.push({ name: "Ollama", run: (signal) => fetch(normalizedOllamaUrl.endsWith("/api") ? `${normalizedOllamaUrl}/tags` : `${normalizedOllamaUrl}/api/tags`, { signal }) });
  }

  if (!checks.length) {
    return { id: "ai", name: "AI Providers", category: "AI", state: "unconfigured", message: "等待配置 OpenAI、OpenRouter、DeepSeek 或 Ollama", detail: "用于 AI 工作台、提示词运行和后续智能汇总。" };
  }

  const results = await Promise.all(checks.map(async (check) => {
    try {
      const response = await withTimeout(check.run);
      return response.ok ? { name: check.name, ok: true } : { name: check.name, ok: false };
    } catch {
      return { name: check.name, ok: false };
    }
  }));
  const connected = results.filter((result) => result.ok).map((result) => result.name);
  if (connected.length) {
    return { id: "ai", name: "AI Providers", category: "AI", state: "connected", message: `可用：${connected.join("、")}`, detail: "至少一个 AI Provider 已通过服务端健康检查。" };
  }
  return { id: "ai", name: "AI Providers", category: "AI", state: "error", message: "已配置但无法访问", detail: "请检查 AI 密钥、DeepSeek 服务、Ollama 服务和网络连接。" };
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "需要先登录 MyOS。" }, { status: 401 });
  }

  const integrations = await Promise.all([supabaseStatus(), n8nStatus(), aiStatus(), githubStatus(), gmailStatus(), googleCalendarStatus(), googleTasksStatus(), googleDriveStatus(), notionStatus()]);
  await Promise.allSettled(integrations.map((integration) => recordIntegrationSync(session, integration.id, integration.state === "connected" ? "success" : integration.state === "unconfigured" ? "unconfigured" : "failed", integration.message)));
  return NextResponse.json({ integrations });
}
