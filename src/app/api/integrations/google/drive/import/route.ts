import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { applyMyOSActionToRepository, readMyOSData } from "@/server/data/repository";
import { listGoogleDriveFiles } from "@/server/integrations/google-platforms";
import { googleErrorResponse, withGoogleAccessToken } from "@/server/integrations/google-route";
import { findGoogleResourceLink, saveGoogleResourceLink } from "@/server/integrations/resource-links";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "需要先登录 MyOS。" }, { status: 401 });
  try {
    const body = await request.json().catch(() => ({})) as { fileIds?: string[] };
    const response = await withGoogleAccessToken((token, signal) => listGoogleDriveFiles(token, signal));
    const selected = body.fileIds?.length ? (response.files || []).filter((file) => body.fileIds?.includes(file.id)) : (response.files || []).slice(0, 20);
    const current = await readMyOSData(session);
    let imported = 0;
    let skipped = 0;
    for (const file of selected) {
      if (!file.id || await findGoogleResourceLink(session, { provider: "google-drive", externalResourceType: "file", externalId: file.id })) {
        skipped += 1;
        continue;
      }
      const next = await applyMyOSActionToRepository(session, {
        type: "addFileRecord",
        payload: {
          name: file.name,
          kind: "Google Drive",
          project: "Google Drive",
          size: file.size ? `${Math.max(1, Math.round(Number(file.size) / 1024))} KB` : "云端文件",
          mimeType: file.mimeType,
          sourceUrl: file.webViewLink || `https://drive.google.com/open?id=${file.id}`
        }
      });
      const localFile = next.files.find((item) => item.name === file.name && item.project === "Google Drive");
      if (localFile) await saveGoogleResourceLink(session, { provider: "google-drive", localEntityType: "file", localEntityId: localFile.id, externalResourceType: "file", externalId: file.id, remoteUpdatedAt: file.modifiedTime, remoteUrl: file.webViewLink });
      imported += 1;
    }
    return NextResponse.json({ message: `已导入 ${imported} 个 Drive 文件记录，跳过 ${skipped} 个已导入项目。`, data: await readMyOSData(session), imported, skipped, hadExistingLocalData: current.files.length > 0 });
  } catch (error) {
    const result = googleErrorResponse(error, "Google Drive 导入失败。");
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
