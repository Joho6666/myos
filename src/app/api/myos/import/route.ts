import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { mergeData } from "@/lib/data/merge";
import type { MyOSData } from "@/lib/data/models";
import { replaceMyOSData } from "@/server/data/repository";
import { SupabaseStoreError } from "@/server/data/supabase-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const importSchema = z.object({
  app: z.literal("MyOS"),
  schemaVersion: z.number().int().min(1),
  data: z.object({
    projects: z.array(z.unknown()).optional(),
    tasks: z.array(z.unknown()).optional(),
    inbox: z.array(z.unknown()).optional(),
    prompts: z.array(z.unknown()).optional(),
    notes: z.array(z.unknown()).optional(),
    files: z.array(z.unknown()).optional(),
    activities: z.array(z.unknown()).optional(),
    automations: z.array(z.unknown()).optional(),
    lifeAreas: z.array(z.unknown()).optional(),
    goals: z.array(z.unknown()).optional(),
    habits: z.array(z.unknown()).optional(),
    habitLogs: z.array(z.unknown()).optional(),
    routines: z.array(z.unknown()).optional(),
    routineSteps: z.array(z.unknown()).optional(),
    routineLogs: z.array(z.unknown()).optional(),
    dailyCheckins: z.array(z.unknown()).optional(),
    dailyReviews: z.array(z.unknown()).optional(),
    weeklyReviews: z.array(z.unknown()).optional()
  })
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "需要先登录 MyOS。" }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "请选择 MyOS JSON 备份文件。" }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "备份文件不能超过 10 MB。" }, { status: 413 });
  }

  try {
    const raw = await file.text();
    const parsed = importSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      return NextResponse.json({ error: "备份文件格式不是 MyOS 导出格式。", issues: parsed.error.issues }, { status: 400 });
    }

    const data = mergeData(parsed.data.data as Partial<MyOSData>);
    return NextResponse.json({ data: await replaceMyOSData(session, data) });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "备份文件不是有效 JSON。" }, { status: 400 });
    }
    if (error instanceof SupabaseStoreError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "导入备份失败。" }, { status: 500 });
  }
}
