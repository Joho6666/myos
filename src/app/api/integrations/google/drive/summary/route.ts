import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listGoogleDriveFiles } from "@/server/integrations/google-platforms";
import { googleErrorResponse, withGoogleAccessToken } from "@/server/integrations/google-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await getSession())) return NextResponse.json({ error: "需要先登录 MyOS。" }, { status: 401 });
  try {
    const response = await withGoogleAccessToken((token, signal) => listGoogleDriveFiles(token, signal));
    return NextResponse.json({ folderId: process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() || null, files: response.files || [], incompleteSearch: Boolean(response.incompleteSearch) });
  } catch (error) {
    const result = googleErrorResponse(error, "Google Drive 读取失败。");
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
