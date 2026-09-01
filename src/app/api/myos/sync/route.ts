import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient, isSupabaseConfigured } from "@/server/data/supabase-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const id = z.string().uuid();
const task = z.object({ id, title: z.string().min(1).max(200), priority: z.enum(["high", "medium", "low"]), due: z.string().optional(), projectId: id.optional(), status: z.enum(["planned", "in_progress", "completed"]), todayFocus: z.boolean(), updatedAt: z.string(), revision: z.number().int().nonnegative() });
const project = z.object({ id, name: z.string().min(1).max(200), category: z.string().min(1).max(200), nextAction: z.string().max(2000), status: z.enum(["planned", "active", "done"]), updatedAt: z.string(), revision: z.number().int().nonnegative() });
const inbox = z.object({ id, title: z.string().min(1).max(200), type: z.enum(["idea", "text", "link", "file"]), category: z.string().min(1).max(200), status: z.enum(["pending", "classified", "archived"]), updatedAt: z.string(), revision: z.number().int().nonnegative() });
const coreAction = z.discriminatedUnion("type", [
  z.object({ type: z.literal("task.upsert"), item: task }), z.object({ type: z.literal("task.delete"), id }),
  z.object({ type: z.literal("project.upsert"), item: project }), z.object({ type: z.literal("project.delete"), id }),
  z.object({ type: z.literal("inbox.upsert"), item: inbox }), z.object({ type: z.literal("inbox.delete"), id })
]);
const requestSchema = z.object({ cursor: z.string().nullable(), operations: z.array(z.object({ id, entity: z.enum(["task", "project", "inbox"]), entityId: id, baseRevision: z.number().int().nonnegative(), action: coreAction })).max(100) });

function eventAction(event: { entity: string; entity_id: string; operation: string; row_data: Record<string, unknown> | null }) {
  if (event.operation === "delete") return { type: `${event.entity}.delete`, id: event.entity_id };
  const row = event.row_data || {};
  if (event.entity === "task") return { type: "task.upsert", item: { id: row.id, title: row.title, priority: row.priority, due: row.due_text || undefined, projectId: row.project_id || undefined, status: row.status === "completed" ? "completed" : row.status === "in_progress" ? "in_progress" : "planned", todayFocus: Boolean(row.today_focus), updatedAt: row.updated_at, revision: Number(row.sync_revision || 1) } };
  if (event.entity === "project") return { type: "project.upsert", item: { id: row.id, name: row.name, category: row.category, nextAction: row.next_action || "", status: row.status === "done" || row.status === "archived" ? "done" : row.status === "active" ? "active" : "planned", updatedAt: row.updated_at, revision: Number(row.sync_revision || 1) } };
  return { type: "inbox.upsert", item: { id: row.id, title: row.title, type: row.item_type, category: row.category || "收件箱", status: row.status, updatedAt: row.updated_at, revision: Number(row.sync_revision || 1) } };
}

async function authenticate(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const client = createSupabaseAdminClient();
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user?.email) return null;
  return { client, user: data.user };
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "云同步暂未配置。" }, { status: 503 });
  const context = await authenticate(request);
  if (!context) return NextResponse.json({ error: "同步登录已过期，请重新登录。" }, { status: 401 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "同步请求格式不正确。" }, { status: 400 });
  const { client, user } = context;
  const accepted: string[] = [];
  const conflicts: Array<Record<string, unknown>> = [];
  for (const operation of parsed.data.operations) {
    const known = await client.from("myos_sync_operations").select("operation_id").eq("operation_id", operation.id).maybeSingle();
    if (known.data) { accepted.push(operation.id); continue; }
    const table = operation.entity === "task" ? "project_tasks" : operation.entity === "project" ? "projects" : "inbox_items";
    const existing = await client.from(table).select("sync_revision,*").eq("user_id", user.id).eq("id", operation.entityId).maybeSingle();
    const revision = Number(existing.data?.sync_revision || 0);
    if (existing.data && revision !== operation.baseRevision && operation.baseRevision !== 0) {
      conflicts.push({ operationId: operation.id, entity: operation.entity, entityId: operation.entityId, local: operation.action, remote: eventAction({ entity: operation.entity, entity_id: operation.entityId, operation: "upsert", row_data: existing.data }) });
      continue;
    }
    const action = operation.action;
    let result: { error: { message: string } | null };
    if (action.type === "task.delete" || action.type === "project.delete" || action.type === "inbox.delete") result = await client.from(table).delete().eq("user_id", user.id).eq("id", action.id);
    else if (action.type === "task.upsert") result = await client.from("project_tasks").upsert({ id: action.item.id, user_id: user.id, project_id: action.item.projectId || null, title: action.item.title, status: action.item.status, priority: action.item.priority, due_text: action.item.due || "今天", today_focus: action.item.todayFocus, updated_at: action.item.updatedAt }, { onConflict: "id" });
    else if (action.type === "project.upsert") result = await client.from("projects").upsert({ id: action.item.id, user_id: user.id, name: action.item.name, slug: `${action.item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project"}-${action.item.id.slice(0, 8)}`, category: action.item.category, next_action: action.item.nextAction, status: action.item.status, updated_at: action.item.updatedAt }, { onConflict: "id" });
    else if (action.type === "inbox.upsert") result = await client.from("inbox_items").upsert({ id: action.item.id, user_id: user.id, title: action.item.title, item_type: action.item.type, category: action.item.category, status: action.item.status, updated_at: action.item.updatedAt }, { onConflict: "id" });
    else return NextResponse.json({ error: "未支持的同步操作。" }, { status: 400 });
    if (result.error) return NextResponse.json({ error: `同步写入失败：${result.error.message}` }, { status: 500 });
    await client.from("myos_sync_operations").insert({ operation_id: operation.id, user_id: user.id });
    accepted.push(operation.id);
  }
  const cursor = Number(parsed.data.cursor || 0);
  const events = await client.from("myos_sync_events").select("id,entity,entity_id,operation,row_data").eq("user_id", user.id).gt("id", cursor).order("id", { ascending: true }).limit(500);
  if (events.error) return NextResponse.json({ error: `读取同步变更失败：${events.error.message}` }, { status: 500 });
  const changes = (events.data || []).map((event) => eventAction(event as never));
  const nextCursor = (events.data || []).at(-1)?.id || cursor;
  return NextResponse.json({ accepted, conflicts, changes, cursor: String(nextCursor) });
}
