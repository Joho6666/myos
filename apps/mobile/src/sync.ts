import type { CoreAction, LocalState, MobileExecution, SyncConflict } from "./data";
import { applyAction, markSyncFailure, markSyncSuccess } from "./data";
import { currentSession } from "./auth";

type SyncResponse = { cursor: string; accepted: string[]; changes: CoreAction[]; conflicts: Array<Omit<SyncConflict, "id" | "createdAt">> };

function syncBaseUrl() {
  const raw = (import.meta.env.VITE_MYOS_SYNC_URL as string | undefined) || "https://myos-mobile.vercel.app";
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("unsupported");
    const host = url.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.endsWith(".local") ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
      /^169\.254\./.test(host)
    ) {
      throw new Error("sync host not allowed");
    }
    return url.origin;
  } catch {
    throw new Error("同步地址无效。");
  }
}

export async function syncState(state: LocalState): Promise<LocalState> {
  const session = await currentSession();
  if (!session) throw new Error("请先通过邮箱链接登录，再同步数据。");
  const endpoint = `${syncBaseUrl()}/api/myos/sync`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ cursor: state.cursor, operations: state.queue })
  });
  const body = await response.json().catch(() => null) as SyncResponse | { error?: string } | null;
  if (!response.ok || !body || !("accepted" in body)) throw new Error((body as { error?: string } | null)?.error || "同步服务暂不可用。");
  let data = state.data;
  for (const action of body.changes) data = applyAction(data, action);
  const conflicts = body.conflicts.map((conflict) => ({ ...conflict, id: crypto.randomUUID(), createdAt: new Date().toISOString() }));
  return markSyncSuccess({
    ...state,
    data,
    cursor: body.cursor,
    queue: state.queue.filter((operation) => !body.accepted.includes(operation.id)),
    conflicts: [...state.conflicts, ...conflicts]
  });
}

export async function fetchCachedExecutions(): Promise<MobileExecution[]> {
  const session = await currentSession();
  if (!session) return [];
  const response = await fetch(`${syncBaseUrl()}/api/myos/mobile/executions`, {
    headers: { accept: "application/json", authorization: `Bearer ${session.access_token}` },
    cache: "no-store"
  });
  const body = await response.json().catch(() => null) as { executions?: MobileExecution[] } | null;
  if (!response.ok) return [];
  return body?.executions || [];
}

export function failedSync(state: LocalState) {
  return markSyncFailure(state);
}
