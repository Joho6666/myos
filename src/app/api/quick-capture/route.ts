import { NextResponse } from "next/server";
import { authenticateQuickRequest } from "@/lib/auth/quick-token";
import { applyMyOSActionToRepository } from "@/server/data/repository";
import { SupabaseStoreError } from "@/server/data/supabase-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type QuickCaptureBody = {
  title?: string;
  text?: string;
  content?: string;
  type?: "text" | "file" | "link" | "idea";
  category?: string;
};

export async function POST(request: Request) {
  const session = await authenticateQuickRequest(request);

  if (!session) {
    return NextResponse.json(
      {
        error: "鉴权失败。请提供有效的 Bearer Token (Authorization: Bearer <TOKEN>) 或 x-api-key 请求头。",
        hint: "请在服务端环境变量或 .env.local 中设置 MYOS_QUICK_API_TOKEN。"
      },
      { status: 401 }
    );
  }

  let body: QuickCaptureBody = {};
  const contentType = request.headers.get("content-type") || "";

  try {
    if (contentType.includes("application/json")) {
      body = (await request.json()) as QuickCaptureBody;
    } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const rawTitle = (formData.get("title") || formData.get("text") || formData.get("content")) as string | null;
      const rawType = formData.get("type") as QuickCaptureBody["type"] | null;
      const rawCategory = formData.get("category") as string | null;

      body = {
        title: rawTitle ?? undefined,
        type: rawType ?? undefined,
        category: rawCategory ?? undefined
      };
    } else {
      const text = await request.text();
      if (text) {
        try {
          body = JSON.parse(text) as QuickCaptureBody;
        } catch {
          body = { title: text.trim() };
        }
      }
    }
  } catch {
    return NextResponse.json({ error: "无法解析请求数据。" }, { status: 400 });
  }

  const rawTitle = typeof body?.title === "string" ? body.title.trim() : typeof body?.text === "string" ? body.text.trim() : "";
  if (!rawTitle) {
    return NextResponse.json({ error: "收件箱内容 (title) 不能为空。" }, { status: 400 });
  }

  const validTypes = ["text", "file", "link", "idea"] as const;
  const rawType = body?.type && validTypes.includes(body.type) ? body.type : "idea";
  const category = typeof body?.category === "string" && body.category.trim() ? body.category.trim() : "inbox";

  try {
    const nextData = await applyMyOSActionToRepository(session, {
      type: "addInbox",
      payload: {
        title: rawTitle,
        type: rawType,
        category
      }
    });

    const addedItem = nextData.inbox[0];

    return NextResponse.json({
      success: true,
      message: "已成功记录到 MyOS 收件箱",
      item: addedItem,
      inboxCount: nextData.inbox.filter((i) => i.status === "pending").length
    });
  } catch (error) {
    if (error instanceof SupabaseStoreError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: error instanceof Error ? error.message : "保存到收件箱失败" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const session = await authenticateQuickRequest(request);

  if (!session) {
    return NextResponse.json({ error: "需要认证。" }, { status: 401 });
  }

  return NextResponse.json({
    status: "ok",
    endpoint: "POST /api/quick-capture",
    description: "快捷写入 MyOS 收件箱 (Inbox)",
    acceptedPayload: {
      title: "必须。录入的内容文本、灵感或链接",
      type: "可选。'idea' | 'text' | 'link' | 'file'，默认 'idea'",
      category: "可选。默认 'inbox'"
    }
  });
}
