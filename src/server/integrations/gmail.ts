type GmailTokenResponse = {
  access_token?: string;
  error_description?: string;
};

export type GmailListResponse = {
  messages?: Array<{ id?: string; threadId?: string }>;
};

export type GmailPayloadPart = {
  filename?: string;
  mimeType?: string;
  body?: {
    attachmentId?: string;
    size?: number;
    data?: string;
  };
  parts?: GmailPayloadPart[];
};

export type GmailMessage = {
  id?: string;
  threadId?: string;
  snippet?: string;
  labelIds?: string[];
  internalDate?: string;
  payload?: GmailPayloadPart & {
    headers?: Array<{ name?: string; value?: string }>;
  };
};

export type GmailAttachmentResponse = {
  data?: string;
  size?: number;
};

export function getGmailHeader(message: GmailMessage, name: string) {
  return message.payload?.headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value || "";
}

export async function refreshGoogleToken(signal: AbortSignal) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("未配置 Google OAuth 凭据。");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    }),
    signal
  });
  const body = (await response.json().catch(() => null)) as GmailTokenResponse | null;
  if (!response.ok || !body?.access_token) {
    throw new Error(body?.error_description || "Google token 刷新失败。");
  }
  return body.access_token;
}

export async function gmailFetch<T>(path: string, accessToken: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me${path}`, {
    headers: { authorization: `Bearer ${accessToken}` },
    signal
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof body?.error?.message === "string" ? body.error.message : `Gmail 返回 ${response.status}`;
    throw new Error(message);
  }
  return body as T;
}

export function collectGmailAttachments(payload?: GmailPayloadPart): Array<{
  filename: string;
  mimeType: string;
  attachmentId: string;
  size: number;
}> {
  if (!payload) return [];
  const current =
    payload.filename && payload.body?.attachmentId
      ? [{
          filename: payload.filename,
          mimeType: payload.mimeType || "application/octet-stream",
          attachmentId: payload.body.attachmentId,
          size: payload.body.size || 0
        }]
      : [];
  return [...current, ...(payload.parts || []).flatMap((part) => collectGmailAttachments(part))];
}

export function decodeGmailAttachmentData(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Buffer.from(padded, "base64");
}
