export const SESSION_COOKIE_NAME = "myos_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export type SessionTokenPayload = {
  email: string;
  exp: number;
};

function getSessionSecret() {
  return process.env.MYOS_SESSION_SECRET?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
}

function encodeBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function importSigningKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function createSessionToken(email: string) {
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error("未配置 MYOS_SESSION_SECRET，无法建立安全登录会话。");
  }

  const payload: SessionTokenPayload = {
    email: email.trim().toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE
  };
  const encodedPayload = encodeBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await importSigningKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encodedPayload));
  return `${encodedPayload}.${encodeBase64Url(new Uint8Array(signature))}`;
}

export async function verifySessionToken(token: string | undefined): Promise<SessionTokenPayload | null> {
  const secret = getSessionSecret();
  if (!secret || !token) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  try {
    const key = await importSigningKey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      decodeBase64Url(parts[1]),
      new TextEncoder().encode(parts[0])
    );
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[0]))) as Partial<SessionTokenPayload>;
    if (typeof payload.email !== "string" || !payload.email || typeof payload.exp !== "number" || payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return { email: payload.email.trim().toLowerCase(), exp: payload.exp };
  } catch {
    return null;
  }
}
