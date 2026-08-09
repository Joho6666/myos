import type { MyOSSession } from "@/lib/auth/session";
import type { MyOSData } from "@/lib/data/models";
import { applyMyOSActionToFile, readMyOSDataFromFile, replaceMyOSDataInFile } from "./file-store";
import type { MyOSAction } from "./schemas";
import { applyMyOSActionToSupabase, isSupabaseConfigured, readMyOSDataFromSupabase, replaceMyOSDataInSupabase } from "./supabase-store";

export type BackendMode = "local-file" | "supabase";

export function getBackendMode(): BackendMode {
  return isSupabaseConfigured() ? "supabase" : "local-file";
}

export async function readMyOSData(session: MyOSSession): Promise<MyOSData> {
  if (getBackendMode() === "supabase") {
    return await readMyOSDataFromSupabase(session);
  }

  return await readMyOSDataFromFile();
}

export async function applyMyOSActionToRepository(session: MyOSSession, action: MyOSAction): Promise<MyOSData> {
  if (getBackendMode() === "supabase") {
    return await applyMyOSActionToSupabase(session, action);
  }

  return await applyMyOSActionToFile(action);
}

export async function replaceMyOSData(session: MyOSSession, data: MyOSData): Promise<MyOSData> {
  if (getBackendMode() === "supabase") {
    return await replaceMyOSDataInSupabase(session, data);
  }

  return await replaceMyOSDataInFile(data);
}
