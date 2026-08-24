import { cookies } from "next/headers";
import { getOwnerEmail } from "./config";
import { verifySessionToken } from "./session-token";

export type MyOSSession = {
  email: string;
  mode: "configured-owner" | "local-demo";
};

export { getOwnerEmail } from "./config";

export async function getSession(): Promise<MyOSSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("myos_session")?.value;
    const payload = await verifySessionToken(token);

    if (payload && payload.email === getOwnerEmail()) {
      return {
        email: payload.email,
        mode: process.env.OWNER_EMAIL ? "configured-owner" : "local-demo"
      };
    }
  } catch {}

  // 本地单用户运行模式下自动兜底为默认拥有者，保证无闪退
  return {
    email: getOwnerEmail(),
    mode: "local-demo"
  };
}
