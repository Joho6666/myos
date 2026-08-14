import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { MyOSSession } from "@/lib/auth/session";
import { serverDataDir } from "@/server/paths";
import { createSupabaseAdminClient, isSupabaseConfigured, resolveOwnerUserId } from "@/server/data/supabase-store";

export type GoogleResourceLink = {
  id: string;
  provider: "google-calendar" | "google-tasks" | "google-drive";
  localEntityType: "task" | "file";
  localEntityId: string;
  externalResourceType: "event" | "task" | "file";
  externalId: string;
  remoteUrl?: string;
  remoteUpdatedAt?: string;
  updatedAt: string;
};

type LinkFile = { links: GoogleResourceLink[] };
const linkFile = path.join(serverDataDir, "google-resource-links.json");
let writeQueue = Promise.resolve();

async function readLocalLinks(): Promise<GoogleResourceLink[]> {
  try {
    const raw = await readFile(linkFile, "utf8");
    const value = JSON.parse(raw) as LinkFile;
    return Array.isArray(value.links) ? value.links : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.error("Failed to read Google resource links", error);
    return [];
  }
}

async function writeLocalLinks(links: GoogleResourceLink[]) {
  await mkdir(serverDataDir, { recursive: true });
  const temporaryFile = `${linkFile}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporaryFile, `${JSON.stringify({ links }, null, 2)}\n`, "utf8");
  await rename(temporaryFile, linkFile);
}

function matches(link: GoogleResourceLink, query: Partial<Pick<GoogleResourceLink, "provider" | "localEntityType" | "localEntityId" | "externalResourceType" | "externalId">>) {
  return Object.entries(query).every(([key, value]) => link[key as keyof typeof link] === value);
}

async function findSupabaseLink(session: MyOSSession, query: Partial<Pick<GoogleResourceLink, "provider" | "localEntityType" | "localEntityId" | "externalResourceType" | "externalId">>) {
  if (!isSupabaseConfigured()) return undefined;
  try {
    const client = createSupabaseAdminClient();
    const userId = await resolveOwnerUserId(client, session);
    let integrationQuery = client.from("external_integrations").select("id,provider").eq("user_id", userId);
    if (query.provider) integrationQuery = integrationQuery.eq("provider", query.provider);
    const { data: integrations, error: integrationError } = await integrationQuery;
    if (integrationError) throw integrationError;
    const integrationIds = (integrations || []).map((item) => String(item.id));
    if (!integrationIds.length) return undefined;
    let linkQuery = client.from("external_resource_links").select("id,integration_id,local_entity_type,local_entity_id,external_resource_type,external_id,remote_updated_at,updated_at").eq("user_id", userId).in("integration_id", integrationIds).limit(1);
    if (query.localEntityType) linkQuery = linkQuery.eq("local_entity_type", query.localEntityType);
    if (query.localEntityId) linkQuery = linkQuery.eq("local_entity_id", query.localEntityId);
    if (query.externalResourceType) linkQuery = linkQuery.eq("external_resource_type", query.externalResourceType);
    if (query.externalId) linkQuery = linkQuery.eq("external_id", query.externalId);
    const { data, error } = await linkQuery.maybeSingle();
    if (error || !data) return undefined;
    const integration = integrations?.find((item) => String(item.id) === String(data.integration_id));
    return {
      id: String(data.id),
      provider: String(integration?.provider || query.provider) as GoogleResourceLink["provider"],
      localEntityType: String(data.local_entity_type) as GoogleResourceLink["localEntityType"],
      localEntityId: String(data.local_entity_id),
      externalResourceType: String(data.external_resource_type) as GoogleResourceLink["externalResourceType"],
      externalId: String(data.external_id),
      remoteUpdatedAt: data.remote_updated_at ? String(data.remote_updated_at) : undefined,
      updatedAt: String(data.updated_at || new Date().toISOString())
    } satisfies GoogleResourceLink;
  } catch {
    return undefined;
  }
}

export async function findGoogleResourceLink(session: MyOSSession, query: Partial<Pick<GoogleResourceLink, "provider" | "localEntityType" | "localEntityId" | "externalResourceType" | "externalId">>) {
  const remote = await findSupabaseLink(session, query);
  if (remote) return remote;
  const links = await readLocalLinks();
  return links.find((link) => matches(link, query));
}

export async function saveGoogleResourceLink(session: MyOSSession, input: Omit<GoogleResourceLink, "id" | "updatedAt">) {
  const now = new Date().toISOString();
  const existing = await findGoogleResourceLink(session, {
    provider: input.provider,
    localEntityType: input.localEntityType,
    localEntityId: input.localEntityId,
    externalResourceType: input.externalResourceType
  });
  const link: GoogleResourceLink = { ...input, id: existing?.id || randomUUID(), updatedAt: now };

  if (isSupabaseConfigured()) {
    try {
      const client = createSupabaseAdminClient();
      const userId = await resolveOwnerUserId(client, session);
      const integration = await client.from("external_integrations").upsert({ user_id: userId, provider: input.provider, status: "connected", sync_status: "资源映射已更新", updated_at: now }, { onConflict: "user_id,provider" }).select("id").single();
      if (integration.error) throw integration.error;
      const saved = await client.from("external_resource_links").upsert({ user_id: userId, integration_id: integration.data.id, local_entity_type: input.localEntityType, local_entity_id: input.localEntityId, external_resource_type: input.externalResourceType, external_id: input.externalId, remote_updated_at: input.remoteUpdatedAt || null, last_synced_at: now, sync_status: "linked", updated_at: now }, { onConflict: "user_id,integration_id,external_id" }).select("id").single();
      if (!saved.error) return link;
    } catch {
      // Keep a local mapping when a remote migration is not ready yet.
    }
  }

  const nextWrite = writeQueue.then(async () => {
    const links = await readLocalLinks();
    const sameLocalEntity = { provider: link.provider, localEntityType: link.localEntityType, localEntityId: link.localEntityId, externalResourceType: link.externalResourceType } as const;
    const sameRemoteResource = { provider: link.provider, externalResourceType: link.externalResourceType, externalId: link.externalId } as const;
    const next = links.filter((item) => !matches(item, sameLocalEntity) && !matches(item, sameRemoteResource));
    next.unshift(link);
    await writeLocalLinks(next.slice(0, 2000));
    return link;
  });
  writeQueue = nextWrite.then(() => undefined, () => undefined);
  return await nextWrite;
}
