import { redirect } from "next/navigation";
export default function NewTaskPage() { redirect("/app/tasks?create=task"); }
