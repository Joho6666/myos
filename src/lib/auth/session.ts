import { cookies } from "next/headers";
import { getOwnerEmail } from "./config";
import { verifySessionToken } from "./session-token";

export type MyOSSession = {
  email: string;
  mode: "configured-owner" | "local-demo";
};

export { getOwnerEmail } from "./config";

export async function getSession(): Promise<MyOSSession | null> {
  const cookieStore = await cookies();
  const payload = await verifySessionToken(cookieStore.get("myos_session")?.value);

  if (!payload || payload.email !== getOwnerEmail()) {
    return null;
  }

  return {
    email: payload.email,
    mode: process.env.OWNER_EMAIL ? "configured-owner" : "local-demo"
  };
}
