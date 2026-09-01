import { getSession } from "@/lib/auth/session";
import { runtimeEventStream } from "@/lib/python-agent/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getSession()) {
    return new Response(JSON.stringify({ error: "需要先登录 MyOS。" }), { status: 401, headers: { "content-type": "application/json" } });
  }
  const { id } = await params;
  try {
    const upstream = await runtimeEventStream(id);
    if (!upstream.body) {
      return new Response(JSON.stringify({ error: "Runtime 没有返回事件流。" }), { status: 502 });
    }
    return new Response(upstream.body, {
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive"
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "无法订阅执行事件。" }), {
      status: 502,
      headers: { "content-type": "application/json" }
    });
  }
}
