import { NextResponse } from "next/server";
import { getSession, getOwnerEmail } from "@/lib/auth/session";
import { myOSActionSchema } from "@/server/data/schemas";
import { MyOSActionError } from "@/server/data/actions";
import { applyMyOSActionToRepository, getBackendMode } from "@/server/data/repository";
import { SupabaseStoreError } from "@/server/data/supabase-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function collectIdValues(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap((item) => collectIdValues(item));

  return Object.entries(value).flatMap(([key, entry]) => {
    if (entry === undefined || entry === null || entry === "") return [];
    if (key === "id" || key.endsWith("Id")) {
      return typeof entry === "string" ? [entry] : [];
    }
    if (key.endsWith("Ids") && Array.isArray(entry)) {
      return entry.filter((item): item is string => typeof item === "string");
    }
    return collectIdValues(entry);
  });
}

export async function POST(request: Request) {
  const session = await getSession() || {
    email: getOwnerEmail(),
    mode: "local-demo" as const
  };

  const parsed = myOSActionSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "提交的数据格式不正确。", issues: parsed.error.issues }, { status: 400 });
  }

  if (getBackendMode() === "supabase") {
    const invalidId = collectIdValues(parsed.data.payload).find((id) => !uuidPattern.test(id));
    if (invalidId) {
      return NextResponse.json({ error: `ID 格式不正确：${invalidId}` }, { status: 400 });
    }
  }

  try {
    const next = await applyMyOSActionToRepository(session, parsed.data);
    return NextResponse.json(next);
  } catch (error) {
    if (error instanceof MyOSActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof SupabaseStoreError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "写入 MyOS 数据失败。" }, { status: 500 });
  }
}
