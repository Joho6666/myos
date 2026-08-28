import { getSession, getOwnerEmail } from "@/lib/auth/session";
import { AppLayout } from "../app-layout";
import "../app-shell.css";
import "../myos-design.css";

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const session = (await getSession()) || {
    email: getOwnerEmail(),
    mode: "local-demo" as const
  };

  return <AppLayout email={session.email}>{children}</AppLayout>;
}
