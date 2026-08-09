import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAIProviders } from "@/lib/ai/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "需要先登录 MyOS。" }, { status: 401 });
  }

  const providers = await Promise.all(
    getAIProviders().map(async (provider) => ({
      id: provider.id,
      name: provider.name,
      status: await provider.testConnection(),
      models: await provider.listModels().catch(() => [])
    }))
  );

  return NextResponse.json({ providers });
}
