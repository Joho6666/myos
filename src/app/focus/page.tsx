import { redirect } from "next/navigation";
import { FocusWidget } from "@/features/desktop/focus-widget";
import { getSession } from "@/lib/auth/session";

export default async function FocusPage() {
  if (!await getSession()) redirect("/login?next=%2Ffocus");
  return <FocusWidget />;
}
