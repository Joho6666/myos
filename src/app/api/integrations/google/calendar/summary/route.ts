import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { googleCalendarDateRange } from "@/server/integrations/google";
import { listGoogleCalendarEvents } from "@/server/integrations/google-platforms";
import { googleErrorResponse, withGoogleAccessToken } from "@/server/integrations/google-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await getSession())) return NextResponse.json({ error: "需要先登录 MyOS。" }, { status: 401 });
  try {
    const params = new URL(request.url).searchParams;
    const range = {
      start: params.get("start") || googleCalendarDateRange().start,
      end: params.get("end") || googleCalendarDateRange().end
    };
    const response = await withGoogleAccessToken((token, signal) => listGoogleCalendarEvents(token, signal, range));
    return NextResponse.json({ calendarId: process.env.GOOGLE_CALENDAR_ID?.trim() || "primary", range, events: response.items || [] });
  } catch (error) {
    const result = googleErrorResponse(error, "Google Calendar 读取失败。");
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
