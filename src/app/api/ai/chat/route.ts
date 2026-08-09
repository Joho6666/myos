import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { getAIProviders } from "@/lib/ai/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const chatSchema = z.object({
  provider: z.string().min(1),
  model: z.string().optional(),
  system: z.string().max(4000).optional(),
  message: z.string().min(1).max(12000)
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "需要先登录 MyOS。" }, { status: 401 });
  }

  const parsed = chatSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "AI 输入格式不正确。", issues: parsed.error.issues }, { status: 400 });
  }

  const provider = getAIProviders().find((item) => item.id === parsed.data.provider);
  if (!provider) {
    return NextResponse.json({ error: "未知 AI Provider。" }, { status: 404 });
  }

  const status = await provider.testConnection();
  if (!status.ok) {
    return NextResponse.json({ error: status.message }, { status: 503 });
  }

  try {
    const result = await provider.chat({
      model: parsed.data.model || "",
      system: parsed.data.system,
      messages: [{ role: "user", content: parsed.data.message }]
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI 调用失败。" }, { status: 500 });
  }
}
