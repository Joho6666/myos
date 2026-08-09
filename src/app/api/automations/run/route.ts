import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { runN8NWorkflow } from "@/lib/automations/n8n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const automationSchema = z.object({
  workflowPath: z.string().min(1).max(300),
  input: z.record(z.string(), z.unknown()).default({})
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "需要先登录 MyOS。" }, { status: 401 });
  }

  const parsed = automationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "自动化输入格式不正确。", issues: parsed.error.issues }, { status: 400 });
  }

  const result = await runN8NWorkflow(parsed.data);
  return NextResponse.json(result, { status: result.ok ? 200 : result.status === "not_configured" ? 503 : 500 });
}
