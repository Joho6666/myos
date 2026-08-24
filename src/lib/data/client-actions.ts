"use client";

import type { MyOSData } from "./models";
import type { MyOSAction } from "@/server/data/schemas";

export async function postMyOSAction(action: MyOSAction) {
  const response = await fetch("/api/myos/actions", {
    method: "POST",
    headers: { "content-type": "application/json" }, credentials: "include",
    body: JSON.stringify(action)
  });
  const body = await response.json().catch(() => null) as MyOSData | { error?: string } | null;

  if (!response.ok) {
    throw new Error((body as { error?: string } | null)?.error || "MyOS 后端没有接受这次操作。");
  }

  return body as MyOSData;
}

export function publishMyOSData(data: MyOSData) {
  window.dispatchEvent(new CustomEvent("myos:data-changed", { detail: data }));
}

