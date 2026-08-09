import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { AppLayout } from "../app-layout";
import "../app-shell.css";

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return <AppLayout email={session.email}>{children}</AppLayout>;
}
