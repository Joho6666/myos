import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { ConfigValidationError, readRuntimeConfig, updateRuntimeConfig } from "@/lib/config/env-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateSchema = z.object({
  values: z.record(z.string(), z.string().max(8000))
});

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "需要先登录 MyOS。" }, { status: 401 });
  }

  return NextResponse.json({ fields: await readRuntimeConfig() });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "需要先登录 MyOS。" }, { status: 401 });
  }

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "配置格式不正确。", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    return NextResponse.json({ fields: await updateRuntimeConfig(parsed.data.values) });
  } catch (error) {
    if (error instanceof ConfigValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "保存配置失败。" }, { status: 500 });
  }
}
