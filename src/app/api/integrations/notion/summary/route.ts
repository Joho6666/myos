import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NotionTitle = {
  plain_text?: string;
};

type NotionProperty = {
  type?: string;
  title?: NotionTitle[];
};

type NotionSearchItem = {
  id?: string;
  object?: "page" | "database";
  url?: string;
  created_time?: string;
  last_edited_time?: string;
  archived?: boolean;
  properties?: Record<string, NotionProperty>;
  title?: NotionTitle[];
};

function extractTitle(item: NotionSearchItem) {
  if (item.object === "database") {
    return item.title?.map((part) => part.plain_text).join("").trim() || "Untitled database";
  }

  const titleProperty = Object.values(item.properties || {}).find((property) => property.type === "title");
  return titleProperty?.title?.map((part) => part.plain_text).join("").trim() || "Untitled page";
}

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "需要先登录 MyOS。" }, { status: 401 });
  }

  const token = process.env.NOTION_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "未配置 NOTION_TOKEN。" }, { status: 503 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch("https://api.notion.com/v1/search", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "notion-version": "2022-06-28"
      },
      body: JSON.stringify({
        page_size: 12,
        sort: { direction: "descending", timestamp: "last_edited_time" }
      }),
      signal: controller.signal
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const message = typeof body?.message === "string" ? body.message : `Notion 返回 ${response.status}`;
      throw new Error(message);
    }

    const items = Array.isArray(body?.results) ? (body.results as NotionSearchItem[]) : [];
    return NextResponse.json({
      items: items.map((item) => ({
        id: item.id || "",
        title: extractTitle(item),
        type: item.object || "page",
        url: item.url || "",
        editedAt: item.last_edited_time || item.created_time || "",
        archived: Boolean(item.archived)
      }))
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Notion 总览读取失败。";
    return NextResponse.json({ error: message }, { status: message.includes("未配置") ? 503 : 502 });
  } finally {
    clearTimeout(timer);
  }
}
