import type { MyOSSession } from "@/lib/auth/session";
import { createSupabaseAdminClient, isSupabaseConfigured, resolveOwnerUserId } from "@/server/data/supabase-store";

export type IntegrationSyncResult = "success" | "failed" | "unconfigured";

export type IntegrationSyncLog = {
  id: string;
  provider: string;
  status: IntegrationSyncResult;
  message: string;
  createdAt: string;
  syncStatus?: string;
  lastSyncedAt?: string;
};

function safeMessage(message: string) {
  return message.replace(/(Bearer\s+)[^\s]+/gi, "$1[redacted]").slice(0, 300);
}

export async function recordIntegrationSync(session: MyOSSession, provider: string, status: IntegrationSyncResult, message: string) {
  if (!isSupabaseConfigured()) return;

  try {
    const client = createSupabaseAdminClient();
    const userId = await resolveOwnerUserId(client, session);
    const now = new Date().toISOString();
    const safe = safeMessage(message);
    const integration = await client.from("external_integrations").upsert({
      user_id: userId,
      provider,
      status: status === "success" ? "connected" : status,
      sync_status: safe,
      last_synced_at: status === "success" ? now : null,
      updated_at: now
    }, { onConflict: "user_id,provider" });
    if (integration.error) return;

    await client.from("sync_logs").insert({
      user_id: userId,
      integration_id: null,
      direction: "pull",
      status,
      message: safe,
      metadata: { source: "connection-health-check" }
    });
  } catch {
    // Connection diagnostics must never make the primary integration request fail.
  }
}

export async function readIntegrationSyncLogs(session: MyOSSession) {
  if (!isSupabaseConfigured()) return { integrations: [], logs: [] as IntegrationSyncLog[] };

  const client = createSupabaseAdminClient();
  const userId = await resolveOwnerUserId(client, session);
  const [integrationsResult, logsResult] = await Promise.all([
    client.from("external_integrations").select("provider,status,sync_status,last_synced_at,updated_at").eq("user_id", userId).order("updated_at", { ascending: false }),
    client.from("sync_logs").select("id,created_at,status,message").eq("user_id", userId).order("created_at", { ascending: false }).limit(30)
  ]);
  if (integrationsResult.error) throw new Error(`读取连接同步状态失败：${integrationsResult.error.message}`);
  if (logsResult.error) throw new Error(`读取连接同步日志失败：${logsResult.error.message}`);

  return {
    integrations: (integrationsResult.data || []).map((item) => ({
      provider: String(item.provider),
      status: String(item.status) as IntegrationSyncResult,
      syncStatus: item.sync_status ? String(item.sync_status) : undefined,
      lastSyncedAt: item.last_synced_at ? String(item.last_synced_at) : undefined
    })),
    logs: (logsResult.data || []).map((item) => ({
      id: String(item.id),
      provider: "连接检查",
      status: String(item.status) as IntegrationSyncResult,
      message: String(item.message || ""),
      createdAt: String(item.created_at)
    }))
  };
}
